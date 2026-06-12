import json
from io import BytesIO
from django.db import connection
from django.http import HttpResponse
from django.http import JsonResponse
from django.template.loader import get_template
from django.contrib.auth.decorators import login_required


from collections import defaultdict

from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from xhtml2pdf import pisa

from ..utils.pagination import get_sp_pagination_params,respond_paginated_sp


@api_view(['POST']) 
@permission_classes([IsAuthenticated])
def set_requisition(request):
    req_id = request.data.get('id', 0) 
    notes = request.data.get('notes', '')
    is_draft = request.data.get('is_draft', 1)
    items = request.data.get('items', [])

    if not items:
        return Response({"error": "La lista de insumos no puede estar vacía."}, status=400)

    try:
        items_json_str = json.dumps(items)
        with connection.cursor() as cursor:
            cursor.execute("CALL sp_insert_requests(%s, %s, %s, %s)", 
                           [req_id, notes, int(is_draft), items_json_str])
            
            columns = [col[0] for col in cursor.description]
            row = cursor.fetchone()
            result = dict(zip(columns, row)) if row else {}

        return Response({
            "status": "success",
            "message": "Requisición procesada",
            "data": result
        }, status=201)

    except Exception as e:
        print(f"Error en SP: {e}")
        return Response({"error": "Error interno al guardar en base de datos"}, status=500)
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_draft_list(request):

    is_draft_param = request.query_params.get('draft', None)
    
    if is_draft_param is not None:
        try:
            is_draft_param = int(is_draft_param)
        except ValueError:
            is_draft_param = None

    try:
        with connection.cursor() as cursor:
            cursor.execute("CALL sp_get_draft_requests_details(%s)", [is_draft_param])
            
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()
            
            results = []
            for row in rows:
                row_dict = dict(zip(columns, row))
                if row_dict.get('items'):
                    row_dict['items'] = json.loads(row_dict['items'])
                results.append(row_dict)

        return Response(results, status=200)
    except Exception as e:
        print(f"Error en get_draft_list: {e}")
        return Response({"error": str(e)}, status=500)
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_next_sku(request):
    try:
        with connection.cursor() as cursor:
            # Obtenemos el ID más alto registrado
            cursor.execute("SELECT MAX(id) FROM vlx_items_requests")
            max_id = cursor.fetchone()[0] or 0
            next_id = max_id + 1
            next_sku = f"RZ-{str(next_id).zfill(4)}"
            
        return Response({"next_sku": next_sku}, status=200)
    except Exception as e:
        return Response({"error": str(e)}, status=500)
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def set_items_delivery(request):
   
    items = request.data.get('items', []) 
    user_id = request.user.id 

    if not items:
        return Response({"error": "No se enviaron artículos para entregar."}, status=400)

    try:
        results = []
        with connection.cursor() as cursor:
            for item in items:
                dtl_id = item.get('dtl_id')
                qty = item.get('qty', 0)
                folio = item.get('folio') 

                if float(qty) > 0:
                    cursor.execute("CALL sp_insert_items_delivery(%s, %s, %s, %s)", 
                                   [dtl_id, float(qty), folio, user_id])
                    
                    columns = [col[0] for col in cursor.description]
                    row = cursor.fetchone()
                    if row:
                        results.append(dict(zip(columns, row)))
            
            while cursor.nextset():
                pass

        return Response({
            "status": "success",
            "message": "Entregas registradas correctamente",
            "summary": results
        }, status=201)

    except Exception as e:
        print(f"Error en set_items_delivery: {e}")
        return Response({"error": f"Error BD: {str(e)}"}, status=500)
    
@login_required
def export_requisition_pdf(request):
    requisition_id = request.GET.get('id')
    
    if not requisition_id:
        return HttpResponse("Error: Se requiere el ID de la requisición.", status=400)
    
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT id, sku, created_at, notes 
            FROM vlx_items_requests 
            WHERE id = %s AND is_active = 1
        """, [requisition_id])
        header_row = cursor.fetchone()
        
    if not header_row:
        return HttpResponse("Error: El pedido solicitado no existe o fue eliminado.", status=404)
        
    requisition = {
        'id': header_row[0],
        'sku': header_row[1],
        'created_at': header_row[2],
        'notes': header_row[3] or 'Sin observaciones registradas.',
        'area_name': 'Almacén Principal'
    }

    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT 
                d.id AS dtl_id,
                d.quantity AS requested_qty,
                (SELECT IFNULL(SUM(qty_delivered), 0) 
                 FROM vlx_items_requests_delivery 
                 WHERE requests_dtl_id = d.id) AS supplied_qty,
                i.nombre AS name,
                IFNULL(c.category, 'Sin Categoría') AS category
            FROM vlx_items_requests_dtls d
            JOIN vlx_items i ON d.item_id = i.id
            LEFT JOIN vlx_items_categories c ON i.id_categoria = c.id
            WHERE d.folio_id = %s AND d.is_active = 1
        """, [requisition_id])
        
        columns = [col[0] for col in cursor.description]
        items_rows = [dict(zip(columns, row)) for row in cursor.fetchall()]

    grouped_items = defaultdict(list)
    for item in items_rows:
        cat = item['category']
        grouped_items[cat].append(item)

    context = {
        'requisition': requisition,
        'grouped_items': dict(grouped_items),
    }
    
    template = get_template('requisicion_panel/pdf_requisicion.html')
    html_content = template.render(context)
    
    pdf_buffer = BytesIO()
    pisa_status = pisa.pisaDocument(BytesIO(html_content.encode("UTF-8")), pdf_buffer)
    
    if not pisa_status.err:
        response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="Pedido_{requisition["sku"]}.pdf"'
        return response
        
    return HttpResponse("Error crítico al intentar formatear el reporte PDF.", status=500)




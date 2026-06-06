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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_items(request):
    if request.method == 'GET':
        search = request.GET.get('search', '')
        try: category_id = int(request.GET.get('category_id', 0))
        except ValueError: category_id = 0

        page, limit, offset = get_sp_pagination_params(request, default_limit=10)

        try:
            with connection.cursor() as cursor:
                cursor.execute("CALL sp_get_items(%s, %s, %s, %s)", [search, category_id, offset, limit])
                columns = [col[0] for col in cursor.description]
                
                results = [dict(zip(columns, row)) for row in cursor.fetchall()]
                
                for item in results:
                    item['isComplete'] = bool(item['isComplete'])

            return respond_paginated_sp(page, limit, results)

        except Exception as e:
            return JsonResponse({"error": f"Error de BD: {str(e)}"}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_categories(request):
    search = request.GET.get('search', '')
    try:
        with connection.cursor() as cursor:
            sql = "SELECT id, category AS name FROM vlx_items_categories WHERE is_active = 1"
            params = []
            
            if search:
                sql += " AND category LIKE %s"
                params.append(f"%{search}%")
            
            sql += " ORDER BY category ASC"
            cursor.execute(sql, params)
            
            columns = [col[0] for col in cursor.description]
            categories = [dict(zip(columns, row)) for row in cursor.fetchall()]
            
        return JsonResponse({"success": True, "data": categories})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_pending_count(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(i.id) 
                FROM vlx_items i
                LEFT JOIN vlx_items_operacion op ON i.id = op.id_item
                WHERE i.is_active = 1 
                  AND (i.codigo IS NULL OR TRIM(i.codigo) = '' OR op.unidad IS NULL)
            """)
            count = cursor.fetchone()[0]
            
        return JsonResponse({"success": True, "count": count})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    

@api_view(['POST']) 
@permission_classes([IsAuthenticated])
def set_insert_item(request):
    item_id = int(request.data.get('id', 0))
    nombre = request.data.get('nombre', '')
    codigo = request.data.get('codigo', '')
    id_categoria = int(request.data.get('id_categoria', 0))
    descripcion = request.data.get('descripcion', '')

    if not nombre.strip():
        return Response({"error": "El nombre del ítem es obligatorio."}, status=400)

    try:
        with connection.cursor() as cursor:
            cursor.execute("CALL sp_insert_item(%s, %s, %s, %s, %s)", 
                           [item_id, nombre, codigo, id_categoria, descripcion])
            
            columns = [col[0] for col in cursor.description]
            row = cursor.fetchone()
            result = dict(zip(columns, row)) if row else {}

        return Response({
            "status": "success",
            "message": "Ítem registrado correctamente",
            "data": result 
        }, status=201)

    except Exception as e:
        print(f"Error en SP sp_insert_item: {e}")
        return Response({"error": "Error interno al guardar en base de datos"}, status=500)
    
@api_view(['POST']) 
@permission_classes([IsAuthenticated])
def set_complete_ficha_tecnica_item(request):
    id_item = request.data.get('id_item')
    
    if not id_item:
        return Response({"error": "El ID del ítem es obligatorio para completar la ficha."}, status=400)

    unidad = int(request.data.get('unidad', 0))
    contenido_empaque = float(request.data.get('contenido_empaque', 1.0))
    peso = float(request.data.get('peso', 0.0))
    rendimiento = float(request.data.get('rendimiento', 100.0))

    tipo_precio = request.data.get('tipo_precio', '')
    precio = float(request.data.get('precio', 0.0))
    utilidad = float(request.data.get('utilidad', 0.0))
    moneda = request.data.get('moneda', 'MXN')
    tasa_cuota = float(request.data.get('tasa_cuota', 0.0))

    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                CALL sp_complete_item_ficha(
                    %s, %s, %s, %s, %s, 
                    %s, %s, %s, %s, %s
                )
            """, [
                id_item, 
                unidad, contenido_empaque, peso, rendimiento,
                tipo_precio, precio, utilidad, moneda, tasa_cuota
            ])
            

        return Response({
            "status": "success",
            "message": "Ficha técnica actualizada correctamente"
        }, status=201)

    except Exception as e:
        print(f"Error en SP sp_complete_item_ficha: {e}")
        return Response({"error": "Error interno al guardar la ficha técnica"}, status=500)
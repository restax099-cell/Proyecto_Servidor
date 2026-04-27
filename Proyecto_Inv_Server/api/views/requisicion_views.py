import json
from django.db import connection
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

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
    try:
        with connection.cursor() as cursor:
            cursor.execute("CALL sp_get_draft_requests_details()")
            
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()
            
            results = []
            for row in rows:
                row_dict = dict(zip(columns, row))
                if row_dict['items']:
                    row_dict['items'] = json.loads(row_dict['items'])
                results.append(row_dict)

        return Response(results, status=200)
    except Exception as e:
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
    


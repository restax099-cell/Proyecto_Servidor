from django.db import connection
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.forms.models import model_to_dict
from rest_framework.renderers import JSONRenderer


import json
import math

from rest_framework.decorators import api_view, permission_classes, renderer_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response


from ..models.xml_models import (
    VlxSatCfdiRaw,
    VlxDataXml,
    VlxTotalDataXml
)

from ..utils.pagination import paginate_and_respond


def dictfetchall(cursor):
    """
    Devuelve todas las filas de un cursor como una lista de diccionarios.
    Asigna los nombres de las columnas a cada valor.
    """
    columns = [col[0] for col in cursor.description]
    return [
        dict(zip(columns, row))
        for row in cursor.fetchall()
    ]

#? Devuelve los datos más importantes solicitando un uuid #

@csrf_exempt
@api_view(["GET"])
def get_xml_file(request):
    if request.method == "GET":
        uuid = request.GET.get("uuid")
        if not uuid:
            return JsonResponse({"error": "Falta el parámetro uuid"}, status=400)
        
        try:
            record = VlxSatCfdiRaw.objects.get(uuid=uuid)
            return JsonResponse({"xmlcontent": record.xmlcontent})
        except VlxSatCfdiRaw.DoesNotExist:
            return JsonResponse({"error": "UUID no encontrado"}, status=404)
    else:
        return JsonResponse({"error": "Método no permitido"}, status=405)

@csrf_exempt
@api_view(["GET"])
@permission_classes([IsAdminUser]) 
@renderer_classes([JSONRenderer])  
def get_xml_data(request):
    if request.method == "GET":
        uuid = request.GET.get("uuid")
        if not uuid:
            return JsonResponse({"error": "Falta el parámetro uuid"}, status=400)
        

        records = VlxDataXml.objects.filter(uuid=uuid)
        
        if not records.exists():
            return JsonResponse({"error": "UUID no encontrado"}, status=404)

        data_list = [model_to_dict(record) for record in records]

        return JsonResponse(data_list, safe=False)
    
    else:
        return JsonResponse({"error": "Método no permitido"}, status=405)
    
@csrf_exempt
@api_view(["GET"])
def get_xml_head(request):
    if request.method != "GET":
        return JsonResponse({"error": "Método no permitido"}, status=405)

    uuid = request.GET.get("uuid")

    if uuid:
        records = VlxTotalDataXml.objects.filter(uuid=uuid)
        if not records.exists():
            return JsonResponse({"error": "UUID no encontrado"}, status=404)
        # Convertir a lista de diccionarios
        data = [model_to_dict(record) for record in records]
        return JsonResponse({"results": data})
    else:
        uuids = list(VlxTotalDataXml.objects.values_list("uuid", flat=True))
        return JsonResponse({"uuids": uuids})
    

#? Devuelve todos los datos de las tablas #


@api_view(["GET"])
@permission_classes([IsAdminUser])
def get_all_raw_cfdi(request):
    records = VlxSatCfdiRaw.objects.all() 
    return paginate_and_respond(request, records, id_order='id') 

@csrf_exempt
@api_view(["GET"])
@permission_classes([IsAdminUser])
def get_all_data_xml(request):
    records = VlxDataXml.objects.all()
    return paginate_and_respond(request, records, id_order='id_data_xml')

@csrf_exempt
@api_view(["GET"])
@permission_classes([IsAdminUser])
def get_all_total_data_xml(request):
    records = VlxTotalDataXml.objects.all() 
    return paginate_and_respond(request, records, id_order='id_total_data_xml')
   


#? API Para consultas WEB ADMIN

@csrf_exempt
@api_view(['GET'])
@permission_classes([IsAdminUser])
@renderer_classes([JSONRenderer]) 
def get_cfdi_consultas(request):

    try:
        p_limit = int(request.query_params.get('limit', 50))
        p_offset = int(request.query_params.get('offset', 0))
    except ValueError:
        return Response({"error": "limit y offset deben ser números."}, status=400)

    # Parametros básicos
    p_fecha_desde = request.query_params.get('fecha_desde', None)
    p_fecha_hasta = request.query_params.get('fecha_hasta', None)
    p_importe_min = request.query_params.get('importe_min', None)
    p_importe_max = request.query_params.get('importe_max', None)
    
    # 1. Buscador Global
    p_search_term = request.query_params.get('search_term', None)

    # 2. Buscadores de Grupo
    p_search_emisor = request.query_params.get('search_emisor', None)
    p_search_receptor = request.query_params.get('search_receptor', None)

    # 3. Filtros Específicos
    p_nombre_emisor = request.query_params.get('nombre_emisor', None)
    p_rfc_emisor = request.query_params.get('rfc_emisor', None)
    p_nombre_receptor = request.query_params.get('nombre_receptor', None)
    p_rfc_receptor = request.query_params.get('rfc_receptor', None)

    # Control
    p_tipo_comprobante = request.query_params.get('tipo_comprobante', None)
    p_metodo_pago = request.query_params.get('metodo_pago', None)
    p_forma_pago = request.query_params.get('forma_pago', None)

    # =========================================================
    # NUEVO: PROCESAMIENTO DE ORDENAMIENTO
    # =========================================================
    # Recibimos algo como 'fecha' o '-importe'
    p_ordering = request.query_params.get('ordering', '-id') # Default: ID Descendente

    p_sort_dir = 'ASC'
    p_sort_col = p_ordering

    # Si empieza con guion, es descendente
    if p_ordering and p_ordering.startswith('-'):
        p_sort_dir = 'DESC'
        p_sort_col = p_ordering[1:] # Quitamos el guion ('-fecha' -> 'fecha')
    
    # =========================================================

    # LISTA ORDENADA PARA EL STORED PROCEDURE
    # NOTA: El orden debe coincidir EXACTAMENTE con el CREATE PROCEDURE
    params = [
        p_fecha_desde,      # 1
        p_fecha_hasta,      # 2
        p_importe_min,      # 3
        p_importe_max,      # 4
        
        p_search_term,      # 5
        
        p_search_emisor,    # 6
        p_search_receptor,  # 7
        
        p_nombre_emisor,    # 8
        p_rfc_emisor,       # 9
        p_nombre_receptor,  # 10
        p_rfc_receptor,     # 11
        
        p_tipo_comprobante, # 12
        p_metodo_pago,      # 13
        p_forma_pago,       # 14
        
        # --- NUEVOS PARAMETROS ---
        p_sort_col,         # 15 (Ej: 'importe')
        p_sort_dir,         # 16 (Ej: 'DESC')
        # -------------------------

        p_limit,            # 17
        p_offset            # 18
    ]

    try:
        with connection.cursor() as cursor:
            # ACTUALIZAMOS EL SQL: Ahora son 18 placeholders (%s)
            sql_query = "CALL sp_get_cfdi_consultas(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);"
            
            cursor.execute(sql_query, params)
            
            # Obtener conteo (Result Set 1)
            count_result = cursor.fetchone()
            total_count = count_result[0] if count_result else 0
            
            # Mover al siguiente Result Set (Los datos)
            cursor.nextset() 
            results = dictfetchall(cursor)
        
        # Paginación
        total_pages = 1 
        if total_count > 0 and p_limit > 0:
            total_pages = math.ceil(total_count / p_limit)

        return Response({
            'total_count': total_count,
            'total_pages': total_pages,
            'results': results
        })

    except Exception as e:
        return Response({"error": "Error BD", "detalle": str(e)}, status=500)
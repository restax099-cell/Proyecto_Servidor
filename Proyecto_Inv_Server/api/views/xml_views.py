from django.db import connection
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.forms.models import model_to_dict
from rest_framework.renderers import JSONRenderer


import json

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

# Devuelve los datos más importantes solicitando un uuid #

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
def get_xml_data(request):
    if request.method == "GET":
        uuid = request.GET.get("uuid")
        if not uuid:
            return JsonResponse({"error": "Falta el parámetro uuid"}, status=400)
        
        try:
            record = VlxDataXml.objects.get(uuid=uuid)
            record_dict = model_to_dict(record) 
            return JsonResponse(record_dict)
        except VlxDataXml.DoesNotExist:
            return JsonResponse({"error": "UUID no encontrado"}, status=404)
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
    

# Devuelve todos los datos de las tablas #


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
   

@csrf_exempt
@api_view(['GET'])
@permission_classes([IsAdminUser])
@renderer_classes([JSONRenderer]) # O [IsAuthenticated] si es para usuarios logueados
def get_cfdi_consolidados(request):
    """
    API para consultar los CFDI consolidados.
    Solo acepta paginación (limit y offset) porque el SP es simple.
    
    Ej: /api/cfdi_consolidados?limit=50&offset=0
    """
    
    # --- 1. Obtener Parámetros de Paginación ---
    try:
        p_limit = int(request.query_params.get('limit', 50))
        p_offset = int(request.query_params.get('offset', 0))
    except ValueError:
        return Response({"error": "limit y offset deben ser números."}, status=400)

    # --- 2. Crear la lista de parámetros ---
    # Solo son 2 parámetros, en este orden
    params = [p_limit, p_offset]

    try:
        with connection.cursor() as cursor:
            # --- 3. Ejecutar el Stored Procedure ---
            sql_query = "CALL sp_get_cfdi_consolidados(%s, %s);"
            cursor.execute(sql_query, params)
            
            # --- 4. Convertir resultados a JSON ---
            results = dictfetchall(cursor)

        # --- 5. Devolver la Respuesta ---
        return Response(results)

    except Exception as e:
        # Capturar cualquier error de la base de datos
        # (Aquí es donde probablemente verías el 'Communications link failure' 
        # si los índices no están creados)
        return Response(
            {"error": "Error al consultar la base de datos.", "detalle": str(e)},
            status=500
        )
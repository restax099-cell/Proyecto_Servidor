from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.forms.models import model_to_dict

import json

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser


from ..models.xml_models import (
    VlxSatCfdiRaw,
    VlxDataXml,
    VlxTotalDataXml
)

from ..utils.pagination import paginate_and_respond

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
   
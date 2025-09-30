from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.forms.models import model_to_dict
from django.core.paginator import Paginator, EmptyPage
import json

from ..models.xml_models import (
    VlxSatCfdiRaw,
    VlxDataXml,
    VlxTotalDataXml
)

# Devuelve los datos más importantes solicitando un uuid #

@csrf_exempt
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
def get_xml_head(request):
    if request.method != "GET":
        return JsonResponse({"error": "Método no permitido"}, status=405)

    uuid = request.GET.get("uuid")

    if uuid:
        # Buscar registros que coincidan con el UUID
        records = VlxTotalDataXml.objects.filter(uuid=uuid)
        if not records.exists():
            return JsonResponse({"error": "UUID no encontrado"}, status=404)
        # Convertir a lista de diccionarios
        data = [model_to_dict(record) for record in records]
        return JsonResponse({"results": data})
    else:
        # No se pasó UUID → devolver solo la lista de UUIDs
        uuids = list(VlxTotalDataXml.objects.values_list("uuid", flat=True))
        return JsonResponse({"uuids": uuids})
    

# Devuelve todos los datos de las tablas #

@csrf_exempt
def get_all_raw_cfdi(request):

    if request.method != "GET":
        return JsonResponse({"error": "Método no permitido"}, status=405)
    
    try:
    
        page_size = int(request.GET.get('limit', 500)) 

        if page_size > 1000: 
            page_size = 1000 
            
        page_number = request.GET.get('page', 1)
        
    except ValueError:
        return JsonResponse({"error": "Los parámetros 'page' y 'limit' deben ser números enteros."}, status=400)

    records = VlxSatCfdiRaw.objects.all().order_by('id') 
    paginator = Paginator(records, page_size)
    
    try:
        page_obj = paginator.get_page(page_number)
    except EmptyPage:
        return JsonResponse({
            "results": [], 
            "error": f"Página {page_number} fuera de rango. Total de páginas: {paginator.num_pages}"
        }, status=404, safe=False)
    except Exception as e:
        return JsonResponse({"error": f"Error al procesar la página: {str(e)}"}, status=400)

    data = [model_to_dict(record) for record in page_obj]
    
    return JsonResponse({
        "results": data,
        "current_page": page_obj.number,
        "total_pages": paginator.num_pages,
        "total_records": paginator.count,
        "has_next": page_obj.has_next(),
    }, safe=False)

@csrf_exempt
def get_all_data_xml(request):
    if request.method != "GET":
        return JsonResponse({"error": "Método no permitido"}, status=405)
    
    try:
    
        page_size = int(request.GET.get('limit', 500)) 

        if page_size > 1000: 
            page_size = 1000 
            
        page_number = request.GET.get('page', 1)
        
    except ValueError:
        return JsonResponse({"error": "Los parámetros 'page' y 'limit' deben ser números enteros."}, status=400)

    records = VlxDataXml.objects.all().order_by('id') 
    paginator = Paginator(records, page_size)
    
    try:
        page_obj = paginator.get_page(page_number)
    except EmptyPage:
        return JsonResponse({
            "results": [], 
            "error": f"Página {page_number} fuera de rango. Total de páginas: {paginator.num_pages}"
        }, status=404, safe=False)
    except Exception as e:
        return JsonResponse({"error": f"Error al procesar la página: {str(e)}"}, status=400)

    data = [model_to_dict(record) for record in page_obj]
    
    return JsonResponse({
        "results": data,
        "current_page": page_obj.number,
        "total_pages": paginator.num_pages,
        "total_records": paginator.count,
        "has_next": page_obj.has_next(),
    }, safe=False)

@csrf_exempt
def get_all_total_data_xml(request):
    if request.method != "GET":
        return JsonResponse({"error": "Método no permitido"}, status=405)
    
    try:
    
        page_size = int(request.GET.get('limit', 500)) 

        if page_size > 1000: 
            page_size = 1000 
            
        page_number = request.GET.get('page', 1)
        
    except ValueError:
        return JsonResponse({"error": "Los parámetros 'page' y 'limit' deben ser números enteros."}, status=400)

    records = VlxTotalDataXml.objects.all().order_by('id') 
    paginator = Paginator(records, page_size)
    
    try:
        page_obj = paginator.get_page(page_number)
    except EmptyPage:
        return JsonResponse({
            "results": [], 
            "error": f"Página {page_number} fuera de rango. Total de páginas: {paginator.num_pages}"
        }, status=404, safe=False)
    except Exception as e:
        return JsonResponse({"error": f"Error al procesar la página: {str(e)}"}, status=400)

    data = [model_to_dict(record) for record in page_obj]
    
    return JsonResponse({
        "results": data,
        "current_page": page_obj.number,
        "total_pages": paginator.num_pages,
        "total_records": paginator.count,
        "has_next": page_obj.has_next(),
    }, safe=False)
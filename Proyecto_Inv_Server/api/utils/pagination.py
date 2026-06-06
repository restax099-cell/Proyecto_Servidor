# Coloca esto en api/views.py (o en api/utils/ si prefieres mantener la separación)
from django.core.paginator import Paginator, EmptyPage
from django.http import JsonResponse
from django.forms.models import model_to_dict


import math

def paginate_and_respond(request, queryset, id_order):
    try:
        page_size = int(request.GET.get('limit', 500)) 
        if page_size > 1000: 
            page_size = 1000 
        page_number = request.GET.get('page', 1)
    except ValueError:
        return JsonResponse({"error": "Los parámetros 'page' y 'limit' deben ser números enteros."}, status=400)

    paginator = Paginator(queryset.order_by(id_order), page_size)
    
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





def get_sp_pagination_params(request, default_limit=10):
    """
    Extrae la página y el límite del request, y calcula el offset.
    Retorna: (page, limit, offset) listos para el Stored Procedure.
    """
    try:
        limit = int(request.GET.get('limit', default_limit))
        if limit > 1000: limit = 1000 
        page = int(request.GET.get('page', 1))
    except ValueError:
        limit = default_limit
        page = 1
        
    offset = (page - 1) * limit
    return page, limit, offset

def respond_paginated_sp(page, limit, raw_data_list, total_column='total_records'):
    """
    Toma los resultados de un SP, extrae el total de registros, 
    limpia la llave y devuelve un JSON estandarizado.
    """
    total_records = 0
    
    if raw_data_list:
        total_records = raw_data_list[0].get(total_column, 0)
        
        for item in raw_data_list:
            item.pop(total_column, None)

    total_pages = math.ceil(total_records / limit) if total_records > 0 else 1
    has_next = page < total_pages

    return JsonResponse({
        "results": raw_data_list,
        "current_page": page,
        "total_pages": total_pages,
        "total_records": total_records,
        "has_next": has_next,
    }, safe=False)
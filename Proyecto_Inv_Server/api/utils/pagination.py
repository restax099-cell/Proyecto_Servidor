# Coloca esto en api/views.py (o en api/utils/ si prefieres mantener la separación)
from django.core.paginator import Paginator, EmptyPage
from django.http import JsonResponse
from django.forms.models import model_to_dict

def paginate_and_respond(request, queryset, id_order):
    """
    Función auxiliar que aplica paginación a un QuerySet y devuelve un JsonResponse.
    """
    
    # 1. Parsing y Validación
    try:
        page_size = int(request.GET.get('limit', 500)) 
        if page_size > 1000: 
            page_size = 1000 
        page_number = request.GET.get('page', 1)
    except ValueError:
        return JsonResponse({"error": "Los parámetros 'page' y 'limit' deben ser números enteros."}, status=400)

    # 2. Paginación
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

    # 3. Serialización y Respuesta
    data = [model_to_dict(record) for record in page_obj]
    
    return JsonResponse({
        "results": data,
        "current_page": page_obj.number,
        "total_pages": paginator.num_pages,
        "total_records": paginator.count,
        "has_next": page_obj.has_next(),
    }, safe=False)
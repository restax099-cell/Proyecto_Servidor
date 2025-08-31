# my_app/views/codes_views.py

from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json
from ..utils.code_utils import get_folio 

@csrf_exempt
def get_folio_from_url(request):
    """
    Vista de Django que recibe una URL y retorna el folio extraído
    al llamar a la función de servicio.
    """
    if request.method == 'GET':
        url = request.GET.get('url', '')
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            url = data.get('url', '')
        except json.JSONDecodeError:
            return JsonResponse({"error": "Formato JSON inválido"}, status=400)
    else:
        return JsonResponse({"error": "Método no permitido"}, status=405)

    if not url:
        return JsonResponse({"error": "Falta el parámetro 'url'"}, status=400)

    try:
        # Llama a la función de servicio en lugar de tener la lógica aquí
        folio = get_folio(url)
        
        if folio.startswith("Error") or folio == "Folio no encontrado":
            return JsonResponse({"error": folio}, status=500)
        else:
            return JsonResponse({"folio": folio, "url_procesada": url}, status=200)

    except Exception as e:
        return JsonResponse({"error": f"Error interno del servidor: {e}"}, status=500)
# api/views/codes_views.py
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from rest_framework.decorators import api_view
import json
from ..utils.code_utils import get_folio
import urllib.parse

@csrf_exempt
@api_view(["GET", "POST"])
def get_folio_from_url(request):
    # La lógica para el método GET y POST es casi la misma, simplifiquemos
    if request.method == 'GET':
        url_recibida = request.GET.get('url', '')
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            url_recibida = data.get('url', '')
        except json.JSONDecodeError:
            return JsonResponse({"error": "Formato JSON inválido"}, status=400)
    else:
        return JsonResponse({"error": "Método no permitido"}, status=405)

    if not url_recibida:
        return JsonResponse({"error": "Falta la URL"}, status=400)

    try:
        # Pasa la URL recibida a tu función de web scraping
        print("----------- URL RECIBIDA -----------")
        print(url_recibida)
        print("----------- FIN URL RECIBIDA -----------")
        folio = get_folio(url_recibida)
        
        if folio.startswith("Error"):
            return JsonResponse({"error": folio}, status=500)
        else:
            return JsonResponse({"folio": folio, "url_procesada": url_recibida}, status=200)

    except Exception as e:
        return JsonResponse({"error": f"Error interno del servidor: {e}"}, status=500)
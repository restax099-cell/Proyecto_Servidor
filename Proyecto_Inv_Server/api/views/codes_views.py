# api/views/codes_views.py

from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json
from ..utils.code_utils import get_folio
import urllib.parse

@csrf_exempt
def get_folio_from_url(request):
    if request.method == 'GET':
        # Accede a los parámetros D1, D2 y D3 directamente
        url_params = {
            'D1': request.GET.get('D1', ''),
            'D2': request.GET.get('D2', ''),
            'D3': request.GET.get('D3', '')
        }
        
        # Reconstruye la URL de forma segura
        base_url = "https://siat.sat.gob.mx/app/qr/faces/pages/mobile/validadorqr.jsf"
        url_procesada = f"{base_url}?D1={url_params['D1']}&D2={url_params['D2']}&D3={url_params['D3']}"
    
    elif request.method == 'POST':
        # La lógica POST permanece sin cambios
        try:
            data = json.loads(request.body)
            url_procesada = data.get('url', '')
        except json.JSONDecodeError:
            return JsonResponse({"error": "Formato JSON inválido"}, status=400)
    
    else:
        return JsonResponse({"error": "Método no permitido"}, status=405)

    if not all(url_params.values()):
        return JsonResponse({"error": "Faltan parámetros de URL (D1, D2, D3)"}, status=400)

    try:
        folio = get_folio(url_procesada)
        
        if folio.startswith("Error"):
            return JsonResponse({"error": folio}, status=500)
        else:
            return JsonResponse({"folio": folio, "url_procesada": url_procesada}, status=200)

    except Exception as e:
        return JsonResponse({"error": f"Error interno del servidor: {e}"}, status=500)
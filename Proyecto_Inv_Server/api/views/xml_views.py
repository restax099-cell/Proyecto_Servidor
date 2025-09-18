from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
import json

from ..models.xml_models import VlxSatCfdiRaw


@csrf_exempt
@require_http_methods(["POST"])
def get_xml_data(request):
    try:
        # Cargar JSON recibido
        data = json.loads(request.body.decode("utf-8"))
        uuid = data.get("uuid")

        if not uuid:
            return JsonResponse({"error": "El campo 'uuid' es requerido."}, status=400)

        # Buscar en la base de datos
        record = VlxSatCfdiRaw.objects.filter(uuid=uuid).first()

        if not record:
            return JsonResponse({"error": f"No se encontró registro con uuid {uuid}"}, status=404)

        # Retornar xmlcontent
        return JsonResponse({
            "xmlcontent": record.xmlcontent
        })

    except json.JSONDecodeError:
        return JsonResponse({"error": "Formato JSON inválido."}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
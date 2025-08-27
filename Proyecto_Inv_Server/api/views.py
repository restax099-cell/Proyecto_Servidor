from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
import base64
from .models import BarCode

@csrf_exempt
def add_barcode(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)

            name = data.get("name", "")
            img_base64 = data.get("img", "")
            img_bytes = base64.b64decode(img_base64) if img_base64 else None

            BarCode.objects.create(
                name=name,
                img=img_bytes,
                status=1
            )

            return JsonResponse({"success": True, "message": "Registro agregado correctamente"})

        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})

    return JsonResponse({"success": False, "error": "Método no permitido"}, status=405)

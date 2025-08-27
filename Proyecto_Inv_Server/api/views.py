from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from .models import BarCode
import base64
import json
from .utils.barcode_utils import decode_barcodes


@csrf_exempt
def add_barcode(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)

            name = data.get("name")
            img_base64 = data.get("img")

            if not img_base64:
                return JsonResponse({"error": "No se envió la imagen"}, status=400)

            # Decodificar imagen Base64 a bytes
            image_bytes = base64.b64decode(img_base64)

            # Detectar códigos de barra (ignora QR)
            barcodes = decode_barcodes(image_bytes)

            if not barcodes:
                return JsonResponse({"error": "No se detectó ningún código de barras"}, status=400)

            # Tomar el primero válido
            barcode_data = barcodes[0].data.decode("utf-8")

            barcode = BarCode.objects.create(
                name=name,
                img=image_bytes,
                code=barcode_data,
                status=1
            )

            return JsonResponse({
                "success": True,
                "id": barcode.id_bar_code,
                "name": barcode.name,
                "code": barcode.code,
                "status": barcode.status
            })

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Método no permitido"}, status=405)

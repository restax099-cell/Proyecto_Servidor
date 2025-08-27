from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from .models import BarCode
import base64
from io import BytesIO
from PIL import Image
from pyzbar.pyzbar import decode
import json

@csrf_exempt
def add_barcode(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)

            name = data.get("name")
            img_base64 = data.get("img")

            if not img_base64:
                return JsonResponse({"error": "No se envió la imagen"}, status=400)

            # Decodificar la imagen Base64
            image_bytes = base64.b64decode(img_base64)
            image = Image.open(BytesIO(image_bytes))

            # Leer códigos en la imagen
            decoded_objects = decode(image)
            if not decoded_objects:
                return JsonResponse({"error": "No se detectó ningún código"}, status=400)

            # Filtrar solo códigos de barra (excluyendo QR)
            barcodes = [obj for obj in decoded_objects if obj.type != "QRCODE"]

            if not barcodes:
                return JsonResponse({"error": "Solo se detectaron QR, no códigos de barra"}, status=400)

            # Tomar el primer código de barra válido
            barcode_data = barcodes[0].data.decode("utf-8")

            barcode = BarCode.objects.create(
                name=name,
                img=image_bytes,   # Guardamos binario
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

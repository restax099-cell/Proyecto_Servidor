import base64
from io import BytesIO
from PIL import Image
from pyzbar.pyzbar import decode
from django.http import JsonResponse
from .models import BarCode

@csrf_exempt
def add_barcode(request):
    if request.method == "POST":
        try:
            import json
            data = json.loads(request.body)

            name = data.get("name")
            img_base64 = data.get("img")

            if not img_base64:
                return JsonResponse({"error": "No se envió la imagen"}, status=400)

            # Decodificar la imagen Base64
            image_bytes = base64.b64decode(img_base64)
            image = Image.open(BytesIO(image_bytes))

            # Leer código de barras con pyzbar
            decoded_objects = decode(image)
            if not decoded_objects:
                return JsonResponse({"error": "No se detectó ningún código de barras"}, status=400)

            barcode_data = decoded_objects[0].data.decode("utf-8")

         
            barcode = BarCode.objects.create(
                name=name,
                img=image_bytes,   # Se guarda binario en LONGBLOB
                code=barcode_data,  # <- necesitas un campo "code" en el modelo
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




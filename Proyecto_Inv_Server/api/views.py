from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json
from .models import BarCode

@csrf_exempt
def add_barcode(request):
    if request.method == "POST":
        try:
            body = json.loads(request.body) 

        
            new_item = BarCode.objects.create(
                name=body.get("name"),
                img=body.get("img"),
                status=1
            )

            return JsonResponse({
                "status": "success",
                "id": new_item.id_bar_code
            })
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=400)


    return JsonResponse({"status": "error", "message": "Método no permitido"}, status=405)

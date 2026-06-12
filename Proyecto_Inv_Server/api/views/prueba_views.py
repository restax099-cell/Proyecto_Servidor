from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import urllib.parse

@csrf_exempt
def get_prueba(request):
    print('hola')
    mensaje_recibido = request.GET.get('mensaje', 'No se recibió ningún mensaje')
    
    return JsonResponse({'mensaje_recibido': mensaje_recibido})
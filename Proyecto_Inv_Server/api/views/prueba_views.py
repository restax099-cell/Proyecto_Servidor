from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import urllib.parse

@csrf_exempt
def get_prueba(request):
    # Obtiene el valor del parámetro 'mensaje'
    print('hola')
    mensaje_recibido = request.GET.get('mensaje', 'No se recibió ningún mensaje')
    
    # Devuelve el mensaje recibido en una respuesta JSON
    return JsonResponse({'mensaje_recibido': mensaje_recibido})
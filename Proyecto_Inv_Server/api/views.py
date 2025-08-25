from django.http import JsonResponse
from .models import PruebaTest 

def consulta_general(request):

    items = PruebaTest.objects.all().values()


    data = list(items)


    return JsonResponse(data, safe=False)
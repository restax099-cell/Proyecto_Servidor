import json
from django.db import connection
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse, JsonResponse
from django.contrib.auth import get_user_model
from rest_framework.decorators import api_view, permission_classes, renderer_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.renderers import JSONRenderer

from rest_framework.response import Response

from rest_framework.permissions import IsAuthenticated

from xhtml2pdf import pisa

from ..utils.pagination import get_sp_pagination_params,respond_paginated_sp




@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_usuarios_conteo(request):
    try:
        User = get_user_model()
        usuarios = list(User.objects.values('id', 'username'))
        
        return JsonResponse({
            "status": "success",
            "data": usuarios
        })
    except Exception as e:
        return JsonResponse({
            "status": "error",
            "message": str(e)
        }, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_stores_conteo(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT `int` AS id, store FROM vlx_stores WHERE is_active = 1")
            columns = [col[0] for col in cursor.description]
            stores = [dict(zip(columns, row)) for row in cursor.fetchall()]
            
        return JsonResponse({
            "status": "success",
            "data": stores
        })
    except Exception as e:
        return JsonResponse({
            "status": "error",
            "message": str(e)
        }, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_lista_catalogos(request):
    if request.method == 'GET':
        search = request.GET.get('search', '')

        try:
            with connection.cursor() as cursor:
                cursor.execute("CALL sp_get_lista_catalogos(%s)", [search])
                columns = [col[0] for col in cursor.description]
                
                results = [dict(zip(columns, row)) for row in cursor.fetchall()]
                
                for item in results:
                    item['categoria_id'] = int(item.get('categoria_id', 0))
                    item['catalogo'] = str(item.get('catalogo', ''))
                    item['categoria'] = str(item.get('categoria', ''))
                    item['cant_items'] = int(item.get('cant_items', 0))

            return JsonResponse(results, safe=False, status=200)

        except Exception as e:
            return JsonResponse({"error": f"Error de BD: {str(e)}"}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def set_conteo_plantilla(request):
    try:
        data = request.data
        
        #? 1. Extraer los datos generales
        codigo = data.get('codigo')
        nombre = data.get('nombre')
        store = int(data.get('store', 1))
        
        user_id = data.get('user_id')
        
        status = int(data.get('status', 1))
        
        #? Frecuencia y Fechas
        frecuencia = data.get('frecuencia')
        dias_semana = data.get('dias_semana') 
        dia_mes = data.get('dia_mes')
        vigencia = data.get('vigencia')
        
        #? Límites
        hora_apertura = data.get('hora_apertura')
        hora_limite = data.get('hora_limite')
        dia_limite = data.get('dia_limite')
        
        #? Configuraciones (Asegurando que sean 1 o 0 para MariaDB)
        bloquear_vencer = int(data.get('bloquear_vencer_limite', 1))
        permitir_buscar = int(data.get('permitir_buscar_fuera_catalogo', 1))
        mostrar_existencia = int(data.get('mostrar_existencia_teorica', 0))

        #? 2. Empaquetar el arreglo de catálogos en un string JSON
        catalogos_list = data.get('catalogos', [])
        catalogos_json = json.dumps(catalogos_list) if catalogos_list else None

        with connection.cursor() as cursor:
            cursor.execute("""
                CALL sp_insert_conteo_plantilla(
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
            """, [
                codigo, nombre, store, user_id, status, frecuencia, dias_semana, dia_mes, 
                vigencia, hora_apertura, hora_limite, dia_limite,
                bloquear_vencer, permitir_buscar, mostrar_existencia,
                catalogos_json
            ])
            
            row = cursor.fetchone()
            id_insertado = row[0] if row else None

        return JsonResponse({
            "status": "success",
            "message": "Plantilla guardada correctamente.",
            "id_plantilla": id_insertado
        }, status=201)

    except Exception as e:
        return JsonResponse({
            "status": "error",
            "error": f"Error de BD: {str(e)}"
        }, status=500)


#? CONSULTA DE PLANTILLAS
def _consultar_plantillas_db(search_query=''):
    """Función auxiliar que hace el trabajo rudo con la base de datos"""
    try:
        with connection.cursor() as cursor:
            cursor.callproc('sp_get_conteo_plantillas', [search_query])
            
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()
            
            plantillas = []
            for row in rows:
                plantilla = dict(zip(columns, row))
                catalogos_str = plantilla.get('catalogos_json')
                
                if catalogos_str:
                    plantilla['catalogos_json'] = json.loads(catalogos_str)
                else:
                    plantilla['catalogos_json'] = []
                    
                plantillas.append(plantilla)
                
        return plantillas
    except Exception as e:
        print(f"Error al obtener plantillas: {e}")
        return []
    
def get_conteo_plantillas(request):
    if request.method == 'GET':
        search_query = request.GET.get('search', '')
        plantillas = _consultar_plantillas_db(search_query)
        return JsonResponse({'status': 'success', 'data': plantillas})
        
    return JsonResponse({'status': 'error', 'message': 'Método no permitido'}, status=405)

def vista_principal_plantillas(request):
    plantillas_iniciales = _consultar_plantillas_db('')
    
    with connection.cursor() as cursor:
        cursor.execute("SELECT `int` AS id, store FROM vlx_stores WHERE is_active = 1")
        columns = [col[0] for col in cursor.description]
        stores_list = [dict(zip(columns, row)) for row in cursor.fetchall()]
    
    contexto = {
        'plantillas_iniciales': json.dumps(plantillas_iniciales),
        'stores_json': json.dumps(stores_list) 
    }
    return render(request, 'tu_app/tu_template.html', contexto)










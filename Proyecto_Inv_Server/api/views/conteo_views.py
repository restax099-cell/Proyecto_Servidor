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
    data = request.data

    # Funciones cortas para evitar repetir condicionales
    to_int = lambda k, default=None: int(data[k]) if data.get(k) not in (None, '') else default
    to_bool = lambda k: int(bool(data[k])) if data.get(k) is not None else None

    catalogos = data.get('catalogos')
    catalogos_json = json.dumps(catalogos) if catalogos is not None else None

    params = [
        to_int('id'),
        data.get('codigo'),
        data.get('nombre'),
        to_int('store'),
        to_int('user_id'),
        to_int('status'),
        data.get('frecuencia'),
        data.get('dias_semana'),
        to_int('dia_mes'),
        data.get('vigencia'),
        data.get('hora_apertura'),
        data.get('hora_limite'),
        to_int('dia_limite'),
        to_bool('bloquear_vencer_limite'),
        to_bool('permitir_buscar_fuera_catalogo'),
        to_bool('mostrar_existencia_teorica'),
        catalogos_json,
        to_int('actualizar_si_existe', 0)  
    ]

    try:
        with connection.cursor() as cursor:
            placeholders = ", ".join(["%s"] * len(params))
            cursor.execute(f"CALL sp_insert_conteo_plantilla({placeholders});", params)
            
            row = cursor.fetchone()
            id_insertado = row[0] if row else None
            estado = row[1] if row and len(row) > 1 else 'OK'

        # Si el SP detectó código repetido y no venía confirmado
        if estado == 'CODIGO_EXISTE':
            return JsonResponse({
                "status": "code_exists",
                "estado": estado,
                "message": "Esta plantilla ya está registrada con ese código."
            }, status=200)

        return JsonResponse({
            "status": "success",
            "message": "Plantilla procesada correctamente.",
            "id_plantilla": id_insertado
        }, status=200)

    except Exception as e:
        return JsonResponse({
            "status": "error",
            "message": f"Error de BD: {str(e)}"
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
    return render(request, 'cont_plant/conteo_plantilla.html', contexto)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def set_conteo_detalle(request):
    try:
        data = request.data
        
        #? 1. Extraer los datos generales y el estatus numérico (2 para borrador, 3 para cerrado)
        plantilla_id = data.get('conteo_plantilla_id')
        status_plantilla = data.get('status', 2)
        
        #? 2. Extraer y empaquetar el arreglo de items en un string JSON
        items_list = data.get('items', [])
        
        # Validación de seguridad básica
        if not plantilla_id or not items_list:
            return JsonResponse({
                "status": "error",
                "error": "Faltan datos obligatorios (conteo_plantilla_id o items)."
            }, status=400)
            
        json_items_string = json.dumps(items_list)

        #? 3. Ejecutar el Stored Procedure con los 3 parámetros
        with connection.cursor() as cursor:
            cursor.execute("""
                CALL sp_save_conteo_detalle(%s, %s, %s)
            """, [
                plantilla_id, 
                json_items_string,
                status_plantilla
            ])
            
            row = cursor.fetchone()
            registros_afectados = row[0] if row else 0


        return JsonResponse({
            "status": "success",
            "message": "Conteo guardado correctamente.",
            "registros_afectados": registros_afectados
        }, status=200)

    except Exception as e:
        return JsonResponse({
            "status": "error",
            "error": f"Error de BD: {str(e)}"
        }, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_conteo_detalle(request): 
    try:
        id = request.GET.get('id')

        if not id:
            return JsonResponse({"status": "error", "error": "ID de plantilla no proporcionado"}, status=400)

        detalles = []
        with connection.cursor() as cursor:
            cursor.execute("CALL sp_get_conteo_detalle(%s)", [id])
            columns = [col[0] for col in cursor.description]
            
            for row in cursor.fetchall():
                fila = dict(zip(columns, row))
                
                if 'conteo' in fila and fila['conteo'] is not None:
                    fila['conteo'] = float(fila['conteo'])
                    
                detalles.append(fila)

        return JsonResponse({
            "status": "success",
            "data": detalles
        }, status=200)

    except Exception as e:
        return JsonResponse({
            "status": "error",
            "error": f"Error de BD: {str(e)}"
        }, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_conteo_dtls(request):
    try:
        plantilla_id = request.GET.get('id')
        fecha = request.GET.get('fecha')

        if not plantilla_id:
            return JsonResponse({
                "status": "error", 
                "error": "ID de plantilla no proporcionado"
            }, status=400)

        if not fecha:
            return JsonResponse({
                "status": "error", 
                "error": "Fecha no proporcionada"
            }, status=400)

        detalles = []
        with connection.cursor() as cursor:
            # Ejecutamos el SP pasando ambos parámetros: ID y Fecha
            cursor.execute("CALL sp_get_conteo_dtls(%s, %s)", [plantilla_id, fecha])
            columns = [col[0] for col in cursor.description]
   
            for row in cursor.fetchall():
                fila = dict(zip(columns, row))
              
                if 'id' in fila and fila['id'] is not None:
                    fila['id'] = int(fila['id'])
                if 'plantilla_id' in fila and fila['plantilla_id'] is not None:
                    fila['plantilla_id'] = int(fila['plantilla_id'])
                if 'item_id' in fila and fila['item_id'] is not None:
                    fila['item_id'] = int(fila['item_id'])
                if 'conteo' in fila and fila['conteo'] is not None:
                    fila['conteo'] = float(fila['conteo'])
                
                detalles.append(fila)

        return JsonResponse({
            "status": "success",
            "data": detalles
        }, status=200)

    except Exception as e:
        return JsonResponse({
            "status": "error",
            "error": f"Error de BD: {str(e)}"
        }, status=500)

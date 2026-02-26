from django.db import connection
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.forms.models import model_to_dict
from django.db.models import Prefetch
from django.utils.dateparse import parse_date
from django.core.paginator import Paginator
from django.shortcuts import render
from django.contrib import messages
from django.db import transaction

import json
import math
import rarfile
import zipfile
import io

from rest_framework.decorators import api_view, permission_classes, renderer_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.renderers import JSONRenderer

from ..models.xml_models import (
    VlxSatCfdiRaw,
    VlxDataXml,
    VlxTotalDataXml,
    VlxSuppliers
)

from ..utils.pagination import paginate_and_respond
from ..utils.xml_extract import main_extract 


def dictfetchall(cursor):
    """
    Devuelve todas las filas de un cursor como una lista de diccionarios.
    Asigna los nombres de las columnas a cada valor.
    """
    columns = [col[0] for col in cursor.description]
    return [
        dict(zip(columns, row))
        for row in cursor.fetchall()
    ]

#? Devuelve los datos más importantes solicitando un uuid #

@csrf_exempt
@api_view(["GET"])
def get_xml_file(request):
    if request.method == "GET":
        uuid = request.GET.get("uuid")
        if not uuid:
            return JsonResponse({"error": "Falta el parámetro uuid"}, status=400)
        
        try:
            record = VlxSatCfdiRaw.objects.get(uuid=uuid)
            return JsonResponse({"xmlcontent": record.xmlcontent})
        except VlxSatCfdiRaw.DoesNotExist:
            return JsonResponse({"error": "UUID no encontrado"}, status=404)
    else:
        return JsonResponse({"error": "Método no permitido"}, status=405)

@csrf_exempt
@api_view(["GET"])
@permission_classes([IsAdminUser]) 
@renderer_classes([JSONRenderer])  
def get_xml_data(request):
    if request.method == "GET":
        uuid = request.GET.get("uuid")
        if not uuid:
            return JsonResponse({"error": "Falta el parámetro uuid"}, status=400)
        

        records = VlxDataXml.objects.filter(uuid=uuid)
        
        if not records.exists():
            return JsonResponse({"error": "UUID no encontrado"}, status=404)

        data_list = [model_to_dict(record) for record in records]

        return JsonResponse(data_list, safe=False)
    
    else:
        return JsonResponse({"error": "Método no permitido"}, status=405)
    

@csrf_exempt
@api_view(["GET"])
def get_xml_head(request):
    if request.method != "GET":
        return JsonResponse({"error": "Método no permitido"}, status=405)

    uuid = request.GET.get("uuid")

    if uuid:
        records = VlxTotalDataXml.objects.filter(uuid=uuid)
        if not records.exists():
            return JsonResponse({"error": "UUID no encontrado"}, status=404)
        # Convertir a lista de diccionarios
        data = [model_to_dict(record) for record in records]
        return JsonResponse({"results": data})
    else:
        uuids = list(VlxTotalDataXml.objects.values_list("uuid", flat=True))
        return JsonResponse({"uuids": uuids})
    

#? Devuelve todos los datos de las tablas #


@api_view(["GET"])
@permission_classes([IsAdminUser])
def get_all_raw_cfdi(request):
    records = VlxSatCfdiRaw.objects.all() 
    return paginate_and_respond(request, records, id_order='id') 

@csrf_exempt
@api_view(["GET"])
@permission_classes([IsAdminUser])
def get_all_data_xml(request):
    records = VlxDataXml.objects.all()
    return paginate_and_respond(request, records, id_order='id_data_xml')

@csrf_exempt
@api_view(["GET"])
@permission_classes([IsAdminUser])
def get_all_total_data_xml(request):
    records = VlxTotalDataXml.objects.all() 
    return paginate_and_respond(request, records, id_order='id_total_data_xml')
   

#? API Para consultas WEB ADMIN
@csrf_exempt
@api_view(['GET'])
@permission_classes([IsAdminUser])
@renderer_classes([JSONRenderer]) 
def get_cfdi_consultas(request):

    try:
        p_limit = int(request.query_params.get('limit', 50))
        p_offset = int(request.query_params.get('offset', 0))
    except ValueError:
        return Response({"error": "limit y offset deben ser números."}, status=400)

    # Parametros básicos
    p_fecha_desde = request.query_params.get('fecha_desde', None)
    p_fecha_hasta = request.query_params.get('fecha_hasta', None)
    p_importe_min = request.query_params.get('importe_min', None)
    p_importe_max = request.query_params.get('importe_max', None)
    
    # 1. Buscador Global
    p_search_term = request.query_params.get('search_term', None)

    # 2. Buscadores de Grupo
    p_search_emisor = request.query_params.get('search_emisor', None)
    p_search_receptor = request.query_params.get('search_receptor', None)

    # 3. Filtros Específicos
    p_nombre_emisor = request.query_params.get('nombre_emisor', None)
    p_rfc_emisor = request.query_params.get('rfc_emisor', None)
    p_nombre_receptor = request.query_params.get('nombre_receptor', None)
    p_rfc_receptor = request.query_params.get('rfc_receptor', None)

    # Control
    p_tipo_comprobante = request.query_params.get('tipo_comprobante', None)
    p_metodo_pago = request.query_params.get('metodo_pago', None)
    p_forma_pago = request.query_params.get('forma_pago', None)
    p_uuid = request.query_params.get('uuid', None)


    p_ordering = request.query_params.get('ordering', '-id') 

    p_sort_dir = 'ASC'
    p_sort_col = p_ordering

    if p_ordering and p_ordering.startswith('-'):
        p_sort_dir = 'DESC'
        p_sort_col = p_ordering[1:] 
    

    params = [
        p_fecha_desde,
        p_fecha_hasta,
        p_importe_min,
        p_importe_max,
        p_search_term,
        p_search_emisor,
        p_search_receptor,
        p_nombre_emisor,
        p_rfc_emisor,
        p_nombre_receptor,
        p_rfc_receptor,
        p_tipo_comprobante,
        p_metodo_pago,
        p_forma_pago,
        None,
        p_sort_col,
        p_sort_dir,
        p_limit,
        p_offset
    ]

    try:
        if p_uuid:
            p_uuid = p_uuid.strip()
            if p_uuid == "":
                p_uuid = None

        if p_uuid:
            params = [
                None, None, None, None, 
                None,            
                None, None,       
                None, None, None, None, 
                None, None, None, 
                
                p_uuid,          
                
                'id', 'ASC',     
                1, 0              
            ]
        else:
            p_ordering = request.query_params.get('ordering', '-id') 
            p_sort_dir = 'ASC'
            p_sort_col = p_ordering
            if p_ordering and p_ordering.startswith('-'):
                p_sort_dir = 'DESC'
                p_sort_col = p_ordering[1:]

            params = [
                request.query_params.get('fecha_desde', None),     
                request.query_params.get('fecha_hasta', None),      
                request.query_params.get('importe_min', None),     
                request.query_params.get('importe_max', None),     
                
                request.query_params.get('search_term', None),     
                request.query_params.get('search_emisor', None),   
                request.query_params.get('search_receptor', None), 
                
                request.query_params.get('nombre_emisor', None),   
                request.query_params.get('rfc_emisor', None),     
                request.query_params.get('nombre_receptor', None), 
                request.query_params.get('rfc_receptor', None),    
                
                request.query_params.get('tipo_comprobante', None),
                request.query_params.get('metodo_pago', None),    
                request.query_params.get('forma_pago', None),       
                
                None,              
                
                p_sort_col,         
                p_sort_dir,
                p_limit,            
                p_offset           
            ]
  
        #!----------------------------------------------------------------------------------------!#

        with connection.cursor() as cursor:
            sql_query = "CALL sp_get_cfdi_consultas(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);"
            cursor.execute(sql_query, params)
            
            count_result = cursor.fetchone()
            total_count = count_result[0] if count_result else 0
            
            cursor.nextset() 
            results = dictfetchall(cursor)

        return Response({
            'total_count': total_count,
            'total_pages': math.ceil(total_count / p_limit) if total_count > 0 and p_limit > 0 else 1,
            'results': results
        })

    except Exception as e:
        return Response({"error": "Error BD", "detalle": str(e)}, status=500)
    

#? API del Historial de Precios
@csrf_exempt
@api_view(['GET'])
@permission_classes([IsAdminUser])
@renderer_classes([JSONRenderer]) 
def get_precios_historicos(request):
    fecha_inicio = request.query_params.get('fecha_desde') or None
    fecha_fin = request.query_params.get('fecha_hasta') or None
    termino = request.query_params.get('search_term', '').strip()

    try:
        page = int(request.query_params.get('page', 1))
    except ValueError:
        page = 1

    limit = 20
    offset = (page - 1) * limit

    try:
        with connection.cursor() as cursor:
            cursor.execute("CALL sp_historic_price(%s, %s, %s, %s, %s)", 
                        [fecha_inicio, fecha_fin, termino, limit, offset])
            row = cursor.fetchone()
            if row and row[1]:
                total_items = row[0]
                results = json.loads(row[1])
            else:
                total_items, results = 0, []

        total_pages = (total_items + limit - 1) // limit

        return Response({
            "total_items": total_items,
            "total_pages": total_pages,
            "current_page": page,
            "results": results
        })
    
    except Exception as e:
        print(f"Error en SP: {e}")
        return Response({"error": "Error interno al procesar los datos"}, status=500)
    

#? API para la importación de facturas .zip / .rar
@csrf_exempt
def import_xml_zip(request):
    if request.method == 'POST':
        keys_to_reset = ['import_current', 'import_total']
        for key in keys_to_reset:
            if key in request.session:
                del request.session[key]

        request.session.modified = True
        request.session.save() 

        archivo = request.FILES.get('zip_file')
        if not archivo:
            messages.error(request, "No se seleccionó ningún archivo.")
            return render(request, 'xml_import/import_xml.html')

        lista_contenidos_xml = []

        try:
            if archivo.name.endswith('.zip'):
                manejador = zipfile.ZipFile(archivo)
            elif archivo.name.endswith('.rar'):
                manejador = rarfile.RarFile(archivo)
            else:
                raise ValueError("Formato no soportado.")

            with manejador as f:
                archivos_internos = f.namelist()
                for nombre in archivos_internos:
                    if nombre.lower().endswith('.xml'):
                        with f.open(nombre) as xml_file:
                            contenido = xml_file.read().decode('utf-8')
                            lista_contenidos_xml.append({
                                'nombre': nombre,
                                'contenido': contenido
                            })

            if not lista_contenidos_xml:
                raise ValueError("El paquete no contiene archivos XML.")
            
   
            request.session['import_total'] = len(lista_contenidos_xml)
            request.session['import_current'] = 0
            request.session.save() 

            total_insertados = main_extract(lista_contenidos_xml, request=request, MAX_WORKERS=15)


            if total_insertados > 0:
                messages.success(request, f"¡Éxito! Se procesaron e insertaron {total_insertados} facturas en la base de datos.")
            else:
                messages.warning(request, "No se insertaron registros nuevos (posibles duplicados).")
            
            

        except Exception as e:
            messages.error(request, f"Error crítico: {str(e)}")
    
    
            
    return render(request, 'xml_import/import_xml.html')


def get_import_progress(request):
    current = request.session.get('import_current', 0)
    total = request.session.get('import_total', 0)
    
    # Evitar división por cero
    progress = int((current / total) * 100) if total > 0 else 0
    
    return JsonResponse({
        'progress': progress,
        'current': current,
        'total': total
    })


#? API del panel de vinculación de items y facturas
@csrf_exempt
@api_view(['GET'])
@permission_classes([IsAdminUser])
@renderer_classes([JSONRenderer]) 
def get_items_sync_panel(request):
    fecha_inicio = request.query_params.get('fecha_desde') or None
    fecha_fin = request.query_params.get('fecha_hasta') or None
    search_provider = request.query_params.get('provider', '').strip()
    search_product = request.query_params.get('product', '').strip()

    status_filter = int(request.query_params.get('status', 0))

    try:
        page = int(request.query_params.get('page', 1))
    except ValueError:
        page = 1

    limit = 20
    offset = (page - 1) * limit

    try:
        with connection.cursor() as cursor:
            cursor.execute("CALL sp_get_inventory_sync(%s, %s, %s, %s, %s, %s, %s)", 
                        [search_provider, search_product, fecha_inicio, fecha_fin, status_filter, limit, offset])
            
            row = cursor.fetchone()
            
            if row and row[1]:
                total_items = row[0]
                results = json.loads(row[1])
            else:
                total_items, results = 0, {}

        total_pages = (total_items + limit - 1) // limit

        return Response({
            "total_items": total_items,
            "total_pages": total_pages,
            "current_page": page,
            "results": results
        })
    
    except Exception as e:
        print(f"Error en SP Inventory Sync: {e}")
        return Response({"error": "Error interno al procesar la sincronización"}, status=500)
    
    
@csrf_exempt
@api_view(['GET'])
@permission_classes([IsAdminUser])
@renderer_classes([JSONRenderer]) 
def get_items_for_modal(request):
    search_term = request.query_params.get('q', '').strip()

    try:
        with connection.cursor() as cursor:
            cursor.callproc('sp_get_items', [search_term])
            
            columns = [col[0] for col in cursor.description]
            results = [dict(zip(columns, row)) for row in cursor.fetchall()]

        return Response(results)
    
    except Exception as e:
        print(f"Error en modal items: {e}")
        return Response({"error": "Error al cargar catálogo de items"}, status=500)
    

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAdminUser])
@renderer_classes([JSONRenderer])
def register_items_association(request):
    id_item = request.data.get('id_item')
    id_concept = request.data.get('id_concept')

    if not id_item or not id_concept:
        return Response({"error": "Faltan parámetros: id_item o id_concept son requeridos."}, status=400)

    try:
        with connection.cursor() as cursor:
            cursor.execute("CALL sp_register_item_association(%s, %s, %s)", [id_item, id_concept, 1])
            
            row = cursor.fetchone()
            
            if row:
                status_result = row[0]
                message = row[1]       
                
                if status_result == 'SUCCESS':
                    return Response({"message": message}, status=200)
                else:
                    return Response({"error": message}, status=400)
            else:
                return Response({"error": "No se obtuvo respuesta de la base de datos."}, status=500)

    except Exception as e:
        print(f"Error al registrar vinculación: {e}")
        return Response({"error": "Error interno del servidor al procesar la vinculación."}, status=500)
    



@csrf_exempt
@api_view(['POST']) 
@permission_classes([IsAdminUser])
def unregister_items_association(request):
    id_concept = request.data.get('id_concept')

    if not id_concept:
        return Response({"error": "El id_concept es obligatorio para desvincular."}, status=400)

    try:
        with connection.cursor() as cursor:
            cursor.execute("CALL sp_unregister_item_association(%s)", [id_concept])
            row = cursor.fetchone()

            if row:
                res_status = row[0] 
                message = row[1]
                
                if res_status == 'SUCCESS':
                    return Response({"message": message}, status=200)
                else:
                    return Response({"error": message}, status=400)
            
            return Response({"error": "La base de datos no devolvió una respuesta válida."}, status=500)

    except Exception as e:
        print(f"Error en unregister_association_api: {e}")
        return Response({"error": "Error interno al procesar la desvinculación."}, status=500)
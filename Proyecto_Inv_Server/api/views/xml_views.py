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
    qp = request.query_params

    try:
        limit = int(qp.get('limit', 50))
        offset = int(qp.get('offset', 0))
    except ValueError:
        return Response({"error": "limit y offset deben ser números."}, status=400)

    def get_param(key):
        val = qp.get(key)
        return val.strip() if isinstance(val, str) and val.strip() != "" else None

    uuid = get_param('uuid')

    if uuid:
        params = [None] * 14 + [uuid, None, 'id', 'ASC', 1, 0]
    else:
        ordering = get_param('ordering') or '-id'
        sort_dir = 'DESC' if ordering.startswith('-') else 'ASC'
        sort_col = ordering.lstrip('-')

        filter_keys = [
            'fecha_desde', 'fecha_hasta', 'importe_min', 'importe_max',
            'search_term', 'search_emisor', 'search_receptor',
            'nombre_emisor', 'rfc_emisor', 'nombre_receptor', 'rfc_receptor',
            'tipo_comprobante', 'metodo_pago', 'forma_pago',
            'uuid', 'folio'
        ]

        params = [get_param(k) for k in filter_keys] + [sort_col, sort_dir, limit, offset]

    try:
        with connection.cursor() as cursor:
            placeholders = ", ".join(["%s"] * len(params))
            cursor.execute(f"CALL sp_get_cfdi_consultas({placeholders});", params)

            count_result = cursor.fetchone()
            total_count = count_result[0] if count_result else 0

            cursor.nextset()
            results = dictfetchall(cursor)

        return Response({
            'total_count': total_count,
            'total_pages': math.ceil(total_count / limit) if total_count > 0 and limit > 0 else 1,
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







   

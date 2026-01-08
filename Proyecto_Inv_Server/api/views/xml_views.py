from django.db import connection
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.forms.models import model_to_dict
from django.db.models import Prefetch
from django.utils.dateparse import parse_date
from django.core.paginator import Paginator

import json
import math

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
        
      
        p_sort_col,         
        p_sort_dir,
       

        p_limit,            
        p_offset           
    ]

    try:
        with connection.cursor() as cursor:
            sql_query = "CALL sp_get_cfdi_consultas(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);"
            
            cursor.execute(sql_query, params)
            
            count_result = cursor.fetchone()
            total_count = count_result[0] if count_result else 0
            
            cursor.nextset() 
            results = dictfetchall(cursor)
        
        # Paginación
        total_pages = 1 
        if total_count > 0 and p_limit > 0:
            total_pages = math.ceil(total_count / p_limit)

        return Response({
            'total_count': total_count,
            'total_pages': total_pages,
            'results': results
        })

    except Exception as e:
        return Response({"error": "Error BD", "detalle": str(e)}, status=500)
    

@csrf_exempt
@api_view(['GET'])
@permission_classes([IsAdminUser])
@renderer_classes([JSONRenderer]) 
def get_precios_historicos(request):
    fecha_inicio = request.query_params.get('fecha_desde')
    fecha_fin = request.query_params.get('fecha_hasta')
    termino_busqueda = request.query_params.get('search_term', '').strip().upper()
    numero_pagina = request.query_params.get('page', 1)

    cabeceras_qs = VlxSatCfdiRaw.objects.all()
    if fecha_inicio and fecha_fin:
        cabeceras_qs = cabeceras_qs.filter(fecha__date__range=[fecha_inicio, fecha_fin])
    elif fecha_inicio:
        cabeceras_qs = cabeceras_qs.filter(fecha__date__gte=fecha_inicio)
    elif fecha_fin:
        cabeceras_qs = cabeceras_qs.filter(fecha__date__lte=fecha_fin)

    dict_fechas = {c['uuid']: c['fecha'] for c in cabeceras_qs.values('uuid', 'fecha')}
    uuids_validos = set(dict_fechas.keys())

    if not uuids_validos:
        return Response({"total_items": 0, "total_pages": 0, "results": []})

    conceptos_qs = VlxDataXml.objects.filter(uuid__in=uuids_validos)
    if termino_busqueda:
        conceptos_qs = conceptos_qs.filter(descripcion__icontains=termino_busqueda)
    
    data_conceptos = conceptos_qs.values('uuid', 'descripcion', 'valor_unitario')

    uuids_finales = {c['uuid'] for c in data_conceptos}
    dict_proveedores = {
        s.uuid: s.nombre_emisor 
        for s in VlxSuppliers.objects.filter(uuid__in=uuids_finales)
    }

    temp_agrupado = {}
    for c in data_conceptos:
        uuid = c['uuid']
        producto = c['descripcion'].strip().upper() if c['descripcion'] else "SIN DESCRIPCIÓN"
        proveedor = dict_proveedores.get(uuid, "PROVEEDOR DESCONOCIDO").upper()
        fecha_item = dict_fechas.get(uuid)
        year_str = str(fecha_item.year) if fecha_item else "S/A"
        precio = round(float(c['valor_unitario'] or 0), 2)

        if producto not in temp_agrupado:
            temp_agrupado[producto] = {"proveedores": {}, "precios_globales": []}
        
        prod_ref = temp_agrupado[producto]
        prod_ref["precios_globales"].append(precio)

        if proveedor not in prod_ref["proveedores"]:
            prod_ref["proveedores"][proveedor] = {}
        
        if year_str not in prod_ref["proveedores"][proveedor]:
            prod_ref["proveedores"][proveedor][year_str] = set()

        prod_ref["proveedores"][proveedor][year_str].add(precio)

    lista_final = []
    termino_busqueda = request.query_params.get('search_term', '').strip().upper()
    for prod_nombre, info in temp_agrupado.items():
        lista_provs = []
        for prov_nombre, years_dict in info["proveedores"].items():
            historico = [{"año": y, "precios": sorted(list(p))} for y, p in sorted(years_dict.items(), reverse=True)]
            min_prov = min([min(p) for p in years_dict.values()])
            lista_provs.append({"nombre": prov_nombre, "precio_min_proveedor": min_prov, "historico": historico})

        lista_provs.sort(key=lambda x: x['precio_min_proveedor'])


        es_exacto = 0 if prod_nombre.startswith(termino_busqueda) else 1

        primer_char = prod_nombre[0] if prod_nombre else ""
        
        if primer_char.isalpha():
            peso_tipo = 0  
        elif primer_char.isdigit():
            peso_tipo = 1 
        else:
            peso_tipo = 2 

        
        prioridad_match = 0 if prod_nombre.startswith(termino_busqueda) else 1

        lista_final.append({
            "peso_tipo": peso_tipo,
            "prioridad_match": prioridad_match,
            "producto": prod_nombre,
            "precio_min_global": min(info["precios_globales"]),
            "proveedores": lista_provs
        })
    
    lista_final.sort(key=lambda x: (x['prioridad_match'], x['peso_tipo'], x['producto']))

 

    paginator = Paginator(lista_final, 20)
    page_obj = paginator.get_page(numero_pagina)

    return Response({
        "total_items": paginator.count,
        "total_pages": paginator.num_pages,
        "current_page": page_obj.number,
        "results": list(page_obj)
    })
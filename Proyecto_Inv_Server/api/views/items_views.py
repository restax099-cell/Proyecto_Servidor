import json
from django.db import connection
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse, JsonResponse
from rest_framework.decorators import api_view, permission_classes, renderer_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.renderers import JSONRenderer

from rest_framework.response import Response

from rest_framework.permissions import IsAuthenticated

from xhtml2pdf import pisa






from ..utils.pagination import get_sp_pagination_params,respond_paginated_sp
from api.utils.item_utils import generar_codigo_barras_bytes
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
            cursor.execute("CALL sp_get_items(%s, %s, %s, %s)", [search_term, 0, 0, 50])
            
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
    

@csrf_exempt
@api_view(['GET'])
@permission_classes([IsAdminUser])
@renderer_classes([JSONRenderer]) 
def get_dashboard(request):
    fecha_inicio = request.query_params.get('fecha_desde') or None
    fecha_fin = request.query_params.get('fecha_hasta') or None
    search_provider = request.query_params.get('provider', '').strip() or None
    search_product = request.query_params.get('product', '').strip() or None

    try:
        page = int(request.query_params.get('page', 1))
    except ValueError:
        page = 1

    limit = 20
    offset = (page - 1) * limit

    try:
        with connection.cursor() as cursor:
            cursor.execute("CALL sp_get_dashboard(%s, %s, %s, %s, %s, %s)", 
                           [search_product, search_provider, fecha_inicio, fecha_fin, limit, offset])
            
            kpi_columns = [col[0] for col in cursor.description]
            kpi_row = cursor.fetchone()
            kpis = dict(zip(kpi_columns, kpi_row)) if kpi_row else {}
            
            total_items = kpis.pop('total_items', 0)

            
            cursor.nextset()
            table_columns = [col[0] for col in cursor.description]
            table_rows = cursor.fetchall()
            results = [dict(zip(table_columns, row)) for row in table_rows]

        total_pages = (total_items + limit - 1) // limit

        return Response({
            "kpis": kpis,
            "pagination": {
                "total_items": total_items,
                "total_pages": total_pages,
                "current_page": page,
                "limit": limit
            },
            "results": results
        })
    
    except Exception as e:
        print(f"Error en SP Dashboard: {e}")
        return Response({"error": "Error interno al procesar el dashboard de auditoría"}, status=500)


#? API del Detalle del Ítem (Drawer)
@csrf_exempt
@api_view(['GET'])
@permission_classes([IsAdminUser])
@renderer_classes([JSONRenderer]) 
def get_dashboard_detail(request):
    item_name = request.query_params.get('item', '').strip()
    
    fecha_inicio = request.query_params.get('fecha_desde') or None
    fecha_fin = request.query_params.get('fecha_hasta') or None
    search_provider = request.query_params.get('provider', '').strip() or None

    if not item_name:
        return Response({"error": "Falta el parámetro 'item'"}, status=400)

    try:
        with connection.cursor() as cursor:
            cursor.execute("CALL sp_get_dashboard_details(%s, %s, %s, %s)", 
                           [item_name, search_provider, fecha_inicio, fecha_fin])
            

            header_row = cursor.fetchone()
            promedio_calculado = header_row[0] if header_row else 0

            cursor.nextset() 
            prov_columns = [col[0] for col in cursor.description]
            prov_rows = cursor.fetchall()
            proveedores = [dict(zip(prov_columns, row)) for row in prov_rows]

            cursor.nextset()
            hist_columns = [col[0] for col in cursor.description]
            hist_rows = cursor.fetchall()
            historial = [dict(zip(hist_columns, row)) for row in hist_rows]

        return Response({
            "item_name": item_name,
            "promedio_calculado": promedio_calculado,
            "proveedores_stats": proveedores,
            "historial_timeline": historial
        })
    
    except Exception as e:
        print(f"Error en SP Item Detail: {e}")
        return Response({"error": "Error interno al procesar el detalle del ítem"}, status=500)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_associate_item(request):
    search = request.GET.get('search', '')
    
    try:
        limit = int(request.GET.get('limit', 50))
        offset = int(request.GET.get('offset', 0))
    except ValueError:
        limit = 50
        offset = 0

    try:
        with connection.cursor() as cursor:
            cursor.execute("CALL sp_get_associate_item(%s, %s, %s)", [search, limit, offset])
            columns = [col[0] for col in cursor.description]
            results = [dict(zip(columns, row)) for row in cursor.fetchall()]

        return JsonResponse({
            "status": "success",
            "data": results
        })

    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)


#? API'S RELACIONADAS AL CATOLOGO DE ITEMS
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_items(request):
    if request.method == 'GET':
        search = request.GET.get('search', '')
        try: 
            category_id = int(request.GET.get('category_id', 0))
        except ValueError: 
            category_id = 0

        page, limit, offset = get_sp_pagination_params(request, default_limit=10)

        try:
            with connection.cursor() as cursor:
                cursor.execute("CALL sp_get_items(%s, %s, %s, %s)", [search, category_id, offset, limit])
                columns = [col[0] for col in cursor.description]
                
                results = [dict(zip(columns, row)) for row in cursor.fetchall()]
                
                for item in results:
                    item['isComplete'] = bool(item.get('isComplete', 0))
                    item['id_brand'] = int(item.get('id_brand', 0))
                    item['descripcion'] = item.get('descripcion', '')
                    item['barcode'] = item.get('barcode', '')

            return respond_paginated_sp(page, limit, results)

        except Exception as e:
            return JsonResponse({"error": f"Error de BD: {str(e)}"}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_categories(request):
    search = request.GET.get('search', '')
    try:
        with connection.cursor() as cursor:
            sql = "SELECT id, code, category AS name FROM vlx_items_categories WHERE is_active = 1"
            params = []
            
            if search:
                sql += " AND category LIKE %s"
                params.append(f"%{search}%")
            
            sql += " ORDER BY category ASC"
            cursor.execute(sql, params)
            
            columns = [col[0] for col in cursor.description]
            categories = [dict(zip(columns, row)) for row in cursor.fetchall()]
            
        return JsonResponse({"success": True, "data": categories})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_pending_count(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(i.id) 
                FROM vlx_items i
                LEFT JOIN vlx_items_operacion op ON i.id = op.id_item
                WHERE i.is_active = 1 
                  AND (i.codigo IS NULL OR TRIM(i.codigo) = '' OR op.unidad IS NULL)
            """)
            count = cursor.fetchone()[0]
            
        return JsonResponse({"success": True, "count": count})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    

@api_view(['POST']) 
@permission_classes([IsAuthenticated])
def set_insert_item(request):
    item_id = int(request.data.get('id') or 0)
    nombre = request.data.get('nombre') or ''
    codigo = request.data.get('codigo') or ''
    barcode = request.data.get('barcode') or '' 
    id_categoria = int(request.data.get('id_categoria') or 0)
    id_brand = int(request.data.get('id_brand') or 1)
    descripcion = request.data.get('descripcion') or ''

    if not nombre.strip():
        return Response({"error": "El nombre del ítem es obligatorio."}, status=400)

    try:
        with connection.cursor() as cursor:
            cursor.execute("CALL sp_insert_item(%s, %s, %s, %s, %s, %s, %s)", 
                           [item_id, nombre, codigo, barcode, id_categoria, id_brand, descripcion])
            
            columns = [col[0] for col in cursor.description]
            row = cursor.fetchone()
            result = dict(zip(columns, row)) if row else {}

        return Response({
            "status": "success",
            "message": "Ítem registrado correctamente",
            "data": result 
        }, status=201)

    except Exception as e:
        print(f"Error en SP sp_insert_item: {e}")
        return Response({"error": "Error interno al guardar en base de datos"}, status=500)



#* Datos Empaque Item (Operation_item)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_operation_item(request):
    id_item = request.GET.get('id_item')

    if not id_item:
        return JsonResponse({
            "status": "error", 
            "message": "Falta el parámetro id_item en la petición"
        }, status=400)

    try:
        with connection.cursor() as cursor:
            cursor.execute("CALL sp_get_operation_item(%s)", [id_item])
            
            columns = [col[0] for col in cursor.description]
            row = cursor.fetchone()

        if row:
            operation_data = dict(zip(columns, row))
            
            operation_data['contenido_empaque'] = float(operation_data.get('contenido_empaque') if operation_data.get('contenido_empaque') is not None else 1.000)
            operation_data['peso'] = float(operation_data.get('peso') if operation_data.get('peso') is not None else 0.000)
            operation_data['rendimiento'] = float(operation_data.get('rendimiento') if operation_data.get('rendimiento') is not None else 100.00)

            return JsonResponse({
                "status": "success", 
                "data": operation_data
            })
        else:
            return JsonResponse({
                "status": "success", 
                "data": None
            })

    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def set_operation_item(request):
    try:
        data = request.data
        
        id_item = data.get('id_item')
        unidad = data.get('unidad', 0)
        contenido_empaque = data.get('contenido_empaque', 1.000)
        peso = data.get('peso', 0.000)
        rendimiento = data.get('rendimiento', 100.00)

        if not id_item:
            return JsonResponse({"status": "error", "message": "El id_item es obligatorio"}, status=400)

        with connection.cursor() as cursor:
            cursor.callproc('sp_save_operation_items', [
                id_item, 
                unidad, 
                contenido_empaque, 
                peso, 
                rendimiento
            ])
        
        return JsonResponse({"status": "success", "message": "Ficha operativa guardada correctamente"})
    
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)



    
@api_view(['POST']) 
@permission_classes([IsAuthenticated])
def set_complete_ficha_tecnica_item(request):
    id_item = request.data.get('id_item')
    
    if not id_item:
        return Response({"error": "El ID del ítem es obligatorio para completar la ficha."}, status=400)

    unidad = int(request.data.get('unidad', 0))
    contenido_empaque = float(request.data.get('contenido_empaque', 1.0))
    peso = float(request.data.get('peso', 0.0))
    rendimiento = float(request.data.get('rendimiento', 100.0))

    tipo_precio = request.data.get('tipo_precio', '')
    precio = float(request.data.get('precio', 0.0))
    utilidad = float(request.data.get('utilidad', 0.0))
    moneda = request.data.get('moneda', 'MXN')
    tasa_cuota = float(request.data.get('tasa_cuota', 0.0))

    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                CALL sp_complete_item_ficha(
                    %s, %s, %s, %s, %s, 
                    %s, %s, %s, %s, %s
                )
            """, [
                id_item, 
                unidad, contenido_empaque, peso, rendimiento,
                tipo_precio, precio, utilidad, moneda, tasa_cuota
            ])
            

        return Response({
            "status": "success",
            "message": "Ficha técnica actualizada correctamente"
        }, status=201)

    except Exception as e:
        print(f"Error en SP sp_complete_item_ficha: {e}")
        return Response({"error": "Error interno al guardar la ficha técnica"}, status=500)
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_item_ficha(request):
    if request.method == 'GET':
        try: 
            item_id = int(request.GET.get('item_id', 0))
        except ValueError: 
            return JsonResponse({"error": "El ID del ítem debe ser un número válido."}, status=400)

        if item_id == 0:
            return JsonResponse({"error": "Se requiere el ID del ítem para consultar su ficha."}, status=400)

        try:
            with connection.cursor() as cursor:
                cursor.execute("CALL sp_get_item_ficha(%s)", [item_id])
                
                row = cursor.fetchone()
                
                if row:
                    columns = [col[0] for col in cursor.description]
                    result = dict(zip(columns, row))
                    
                    return JsonResponse({
                        "status": "success", 
                        "data": result
                    }, status=200)
                else:
                    return JsonResponse({
                        "error": "No se encontró la ficha técnica para este ítem o está incompleta."
                    }, status=404)

        except Exception as e:
            return JsonResponse({"error": f"Error de BD: {str(e)}"}, status=500)
        

@api_view(['POST']) 
@permission_classes([IsAuthenticated])
def set_deactivate_item(request):
    try:
        item_id = request.data.get('item_id')
        
        if not item_id:
            return JsonResponse({"error": "Se requiere el ID del ítem."}, status=400)

        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE vlx_items 
                SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
                WHERE id = %s
            """, [item_id])
            
            if cursor.rowcount == 0:
                return JsonResponse({"error": "No se encontró el ítem o ya estaba eliminado."}, status=404)
            
        return JsonResponse({"status": "success", "message": "Ítem eliminado correctamente."})

    except Exception as e:
        return JsonResponse({"error": f"Error al eliminar: {str(e)}"}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated]) 
def get_barcode_image(request):
    codigo = request.GET.get('codigo')
    
    if not codigo:
        return JsonResponse({"error": "Se requiere el parámetro 'codigo'."}, status=400)

    imagen_bytes = generar_codigo_barras_bytes(codigo)
    
    if imagen_bytes:
        return HttpResponse(imagen_bytes, content_type="image/png")
    else:
        return JsonResponse({"error": "Error interno al generar la imagen."}, status=500)
    

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def set_save_category(request):
    try:
        data = request.data
        
        p_id = data.get('id', 0) 
        p_code = data.get('code', '')
        p_category = data.get('category', '')
        p_is_active = data.get('is_active', 1)
        p_display_order = data.get('display_order', 0)

        if not p_category:
            return JsonResponse({"error": "El nombre de la categoría es obligatorio."}, status=400)

        with connection.cursor() as cursor:
            cursor.callproc('sp_save_category_item', [
                p_id, 
                p_code, 
                p_category, 
                p_is_active, 
                p_display_order
            ])
            
            row = cursor.fetchone()
            
            if row:
                result_id = row[0]
                action = row[1]
            else:
                raise Exception("El procedimiento no devolvió resultados.")

        return JsonResponse({
            "mensaje": "Categoría procesada con éxito.",
            "id": result_id,
            "accion": action
        }, status=200)

    except Exception as e:
        print(f"Error en save_category: {e}")
        return JsonResponse({"error": "Ocurrió un error interno al guardar la categoría."}, status=500)



#* APIS RELACIONADAS A BRANDS (MARCAS)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_brands(request):
    search_term = request.GET.get('search', '').strip()
    
    try:
        with connection.cursor() as cursor:
            cursor.callproc('sp_get_brands', [search_term])
            
            brands = [
                {
                    "id": row[0], 
                    "brand_category_id": row[1],
                    "name": row[2],
                    "descripcion": row[3]
                } 
                for row in cursor.fetchall()
            ]

        return JsonResponse({
            "status": "success", 
            "brands": brands
        })
        
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_brands_categories(request):
    search_term = request.GET.get('search', '').strip()
    
    try:
        with connection.cursor() as cursor:
            cursor.callproc('sp_get_categories_brands', [search_term])
            
            categories = [
                {
                    "id": row[0], 
                    "name": row[1]
                } 
                for row in cursor.fetchall()
            ]

        return JsonResponse({
            "status": "success", 
            "brandCategories": categories
        })
        
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def set_brand(request):
    try:
        data = request.data
        
        brand_id = data.get('id') or None 
        brandcategorie_id = data.get('id_brandcategory')
        name = data.get('nombre')
        description = data.get('descripcion', '')
        is_active = data.get('is_active', 1)

        if not name or not brandcategorie_id:
            return JsonResponse({"status": "error", "message": "El nombre y la categoría son obligatorios"}, status=400)

        with connection.cursor() as cursor:
            cursor.callproc('sp_save_brands', [brand_id, brandcategorie_id, name, description, is_active])
        
        return JsonResponse({"status": "success", "message": "Marca guardada correctamente"})
    
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def set_brand_category(request):
    try:
        data = request.data
        
        brandcategorie_id = data.get('brandcategorie_id') or None
        name = data.get('name')
        is_active = data.get('is_active', 1)

        if not name:
            return JsonResponse({"status": "error", "message": "El nombre de la categoría es obligatorio"}, status=400)

        with connection.cursor() as cursor:
            cursor.callproc('sp_save_brands_categories', [brandcategorie_id, name, is_active])
        
        return JsonResponse({"status": "success", "message": "Categoría de marca guardada correctamente"})
    
    except Exception as e:
        print(f" ERROR EN LA BASE DE DATOS: {str(e)}") 
        return JsonResponse({"status": "error", "message": str(e)}, status=500)
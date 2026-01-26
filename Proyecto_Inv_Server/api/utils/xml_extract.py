import mysql.connector
import os
import io
import pandas as pd
import xmltodict
import warnings
import re
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv


warnings.filterwarnings("ignore", category=DeprecationWarning)
warnings.filterwarnings("ignore", category=FutureWarning)
load_dotenv()
DB_CONFIG = {
    'user': os.getenv("USER_DB"),  
    'password': os.getenv("PASSWORD_DB"),
    'host': os.getenv("HOST_DB"),
    'database': os.getenv("NAME_DB"),
    'port': int(os.getenv("PORT_DB", 3306))
}


def limpiar_valor(valor):
    if pd.isna(valor) or valor == '' or valor is None: return None
    return str(valor)

def get_val(nodo, keys, default=None):
    """Busca un valor en un diccionario anidado o devuelve default"""
    val = nodo
    for key in keys:
        if isinstance(val, dict):
            val = val.get(key)
        else:
            return default
    return val if val is not None else default

def safe_float(val):
    if not val: return 0.0
    try:
        return float(val)
    except (ValueError, TypeError):
        return 0.0

def obtener_lista(nodo, key_principal, key_alternativa=None):
    """Devuelve siempre una lista, ya sea que xmltodict devuelva dict, list o None"""
    if not nodo: return []
    val = nodo.get(key_principal)
    if not val and key_alternativa:
        val = nodo.get(key_alternativa)
    
    if not val: return []
    if isinstance(val, list): return val
    return [val]
# ---------------------------------------------------------------------

def procesar_factura_completa(archivo_input):
    try:
        xml_str = ""
        # 1. Si es un string (ruta de archivo en disco)
        if isinstance(archivo_input, str):
            with open(archivo_input, 'r', encoding='utf-8') as f:
                xml_str = f.read()
        # 2. Si es un objeto (StringIO desde la RAM de Django)
        else:
            xml_str = archivo_input.read()
            # Opcional: regresar el cursor al inicio si se requiere releer
            archivo_input.seek(0)

        xml_str = re.sub(r'&(?!(amp|lt|gt|quot|apos);)', '&amp;', xml_str)
            
        xml_data = xmltodict.parse(xml_str)
        
        # Búsqueda flexible de raíz
        root = xml_data.get('cfdi:Comprobante') or xml_data.get('Comprobante')
        if not root: return None, None, None, None

        # Definición de nodos comunes
        complemento = root.get('cfdi:Complemento') or root.get('Complemento') or {}
        tfd = complemento.get('tfd:TimbreFiscalDigital') or complemento.get('TimbreFiscalDigital') or {}
        
        emisor = root.get('cfdi:Emisor') or root.get('Emisor') or {}
        receptor = root.get('cfdi:Receptor') or root.get('Receptor') or {}
        
        uuid = tfd.get('@UUID')
        if not uuid: return None, None, None, None

        # ---------------------------------------------------------
        # A. RAW
        # ---------------------------------------------------------
        data_raw = {'uuid': uuid, 'fecha': root.get('@Fecha'), 'xmlcontent': xml_str}

        # ---------------------------------------------------------
        # B. SUPPLIERS
        # ---------------------------------------------------------
        data_suppliers = {
            'uuid': uuid,
            'rfc_emisor': emisor.get('@Rfc'), 'nombre_emisor': emisor.get('@Nombre'),
            'regimen_fiscal': emisor.get('@RegimenFiscal'), 'rfc_receptor': receptor.get('@Rfc'),
            'nombre_receptor': receptor.get('@Nombre'), 'uso_cfdi': receptor.get('@UsoCFDI'),
            'schema_location': root.get('@xsi:schemaLocation'), 'uuid_fiscal': uuid,
            'fecha_timbrado': tfd.get('@FechaTimbrado'), 'rfc_prov_certif': tfd.get('@RfcProvCertif'),
            'sello_cfd': tfd.get('@SelloCFD'), 'no_certificado_sat': tfd.get('@NoCertificadoSAT'),
            'sello_sat': tfd.get('@SelloSAT')
        }

        # ---------------------------------------------------------
        # C. TOTALS (Lógica fusionada y mejorada)
        # ---------------------------------------------------------
        base_total = 0.0
        tipo_comprobante = root.get('@TipoDeComprobante') or root.get('@tipoDeComprobante')
        impuestos_gen = root.get('cfdi:Impuestos') or root.get('Impuestos') or {}
        version_xml = root.get('@Version') or root.get('@version')

        # --- Lógica de cálculo de BASE ---
        
        # CASO: Pagos (P)
        if tipo_comprobante == 'P':
            pagos_container = complemento.get('pago20:Pagos') or complemento.get('pago10:Pagos')
            if pagos_container:
                # Intento 1: Totales globales (Solo Pagos 2.0)
                totales_pago = pagos_container.get('pago20:Totales')
                if isinstance(totales_pago, list): totales_pago = totales_pago[0] # Protección lista

                if totales_pago:
                    base_total = safe_float(totales_pago.get('@TotalTrasladosBaseIVA16'))
                else:
                    # Intento 2: Sumar pagos individuales (Pagos 1.0 o fallback)
                    lista_pagos = obtener_lista(pagos_container, 'pago20:Pago', 'pago10:Pago')
                    suma_pagos = 0.0
                    for p in lista_pagos:
                        suma_pagos += safe_float(p.get('@Monto', '0'))
                    # En pagos 1.0 a veces la base se considera el total pagado
                    base_total = suma_pagos 

        # CASO: XML 4.0
        elif version_xml == "4.0":
            nodo_traslados = impuestos_gen.get('cfdi:Traslados') or impuestos_gen.get('Traslados')
            if nodo_traslados:
                lista_traslados = obtener_lista(nodo_traslados, 'cfdi:Traslado', 'Traslado')
                for t in lista_traslados:
                    base_total += safe_float(t.get('@Base'))

        # CASO: XML 3.3
        elif version_xml == "3.3":
            # En 3.3 la base a veces no está en globales, hay que sumar conceptos
            contenedor_conceptos = root.get('cfdi:Conceptos') or root.get('Conceptos')
            lista_conceptos = obtener_lista(contenedor_conceptos, 'cfdi:Concepto', 'Concepto')
            
            for concepto in lista_conceptos:
                impuestos_concepto = concepto.get('cfdi:Impuestos') or concepto.get('Impuestos')
                if impuestos_concepto:
                    contenedor_traslados = impuestos_concepto.get('cfdi:Traslados') or impuestos_concepto.get('Traslados')
                    lista_traslados = obtener_lista(contenedor_traslados, 'cfdi:Traslado', 'Traslado')
                    for t in lista_traslados:
                        base_total += safe_float(t.get('@Base'))
            
            # Fallback si no hubo desglose de impuestos
            if base_total == 0:
                base_total = safe_float(root.get('@SubTotal'))

        # CASO: XML 3.2 (Legacy)
        elif version_xml == "3.2":
            contenedor_conceptos = root.get('cfdi:Conceptos') or root.get('Conceptos')
            lista_conceptos = obtener_lista(contenedor_conceptos, 'cfdi:Concepto', 'Concepto')
            
            for concepto in lista_conceptos:
                # En 3.2 a menudo se sumaba el importe como base
                base_total += safe_float(concepto.get('@importe'))
            
            if base_total == 0:
                base_total = safe_float(root.get('@subTotal'))

        # --- Extracción de valores finales ---
        val_importe = impuestos_gen.get('@TotalImpuestosTrasladados', '0')
        val_sub = root.get('@SubTotal', '0')
        val_desc = root.get('@Descuento', '0')
        val_mon = root.get('@Moneda', 'XXX')
        val_met = root.get('@MetodoPago')
        val_forma = root.get('@FormaPago')
        val_total = root.get('@Total', '0')

        # Ajustes finales específicos para Pagos y Legacy
        if tipo_comprobante == 'P':
            pagos_container = complemento.get('pago20:Pagos') or complemento.get('pago10:Pagos')
            if isinstance(pagos_container, list): pagos_container = pagos_container[0]

            p_moneda = 'XXX'
            p_forma = '99'
            p_total_pagado = 0.0
            p_impuesto = '0'
            val_met = "" 

            if pagos_container:
                # Datos de Totales 2.0
                totales_pago = pagos_container.get('pago20:Totales')
                if isinstance(totales_pago, list): totales_pago = totales_pago[0]

                if totales_pago:
                    p_impuesto = totales_pago.get('@TotalTrasladosImpuestoIVA16', '0')

                # Datos de los nodos de pago individuales
                lista_pagos = obtener_lista(pagos_container, 'pago20:Pago', 'pago10:Pago')
                if lista_pagos:
                    p_moneda = lista_pagos[0].get('@MonedaP', 'XXX')
                    p_forma = lista_pagos[0].get('@FormaDePagoP', '99')
                    for p in lista_pagos:
                        p_total_pagado += safe_float(p.get('@Monto'))
            
            # Sobreescribimos valores genéricos con los de pago
            val_importe = p_impuesto
            val_sub = base_total # La base calculada arriba
            val_mon = p_moneda
            val_forma = p_forma
            val_total = p_total_pagado

        elif version_xml == "3.2":
            val_importe = impuestos_gen.get('@totalImpuestosTrasladados', '0')
            val_sub = root.get('@subTotal', '0')
            val_desc = root.get('@descuento', '0')
            val_mon = root.get('@moneda', 'NoEspecificado')
            val_tipo = root.get('@tipoDeComprobante')
            val_met = root.get('@metodoDePago')
            val_forma = root.get('@formaDePago')
            val_total = root.get('@total', '0')

        data_totals = {
            'uuid': uuid,
            'base': safe_float(base_total),
            'base_IVA': 0, # OJO: Tu lógica nueva calcula base total, pero no desglosa base IVA especifico. 
                           # Si requieres solo base IVA, tendrías que filtrar por impuesto '002' en los bucles de arriba.
            'importe': safe_float(val_importe),
            'sub_total': safe_float(val_sub),
            'descuento': safe_float(val_desc),
            'moneda': val_mon,
            'tipo_comprobante': tipo_comprobante,
            'metodo_pago': val_met,
            'forma_pago': val_forma,
            'total': safe_float(val_total)
        }

        # ---------------------------------------------------------
        # CONCEPTOS (Original)
        # ---------------------------------------------------------
        conceptos_list = []
        nodo_conceptos = root.get('cfdi:Conceptos') or root.get('Conceptos')
        
        if nodo_conceptos:
            raw_conceptos = nodo_conceptos.get('cfdi:Concepto') or nodo_conceptos.get('Concepto')
            if isinstance(raw_conceptos, dict): raw_conceptos = [raw_conceptos]
            
            if raw_conceptos:
                for idx, c in enumerate(raw_conceptos, start=1):
                    imps = c.get('cfdi:Impuestos') or c.get('Impuestos') or {}
                    tras = imps.get('cfdi:Traslados') or imps.get('Traslados') or {}
                    
                    # Usamos obtener_lista para seguridad aqui tambien
                    t_list = obtener_lista(tras, 'cfdi:Traslado', 'Traslado')
                    
                    if t_list: t_obj = t_list[0]
                    else: t_obj = {}

                    conceptos_list.append({
                        'uuid': uuid, 'no_concepto': idx,
                        'clave_prod_serv': c.get('@ClaveProdServ'), 'clave_unidad': c.get('@ClaveUnidad'),
                        'cantidad': c.get('@Cantidad'), 'unidad': c.get('@Unidad'),
                        'descripcion': c.get('@Descripcion'), 'valor_unitario': c.get('@ValorUnitario'),
                        'importe': c.get('@Importe'), 'descuento': c.get('@Descuento', '0'),
                        'base': t_obj.get('@Base'), 'impuesto': t_obj.get('@Impuesto'),
                        'tipo_factor': t_obj.get('@TipoFactor'), 'tasa_cuota': t_obj.get('@TasaOCuota'),
                        'importe_imp': t_obj.get('@Importe')
                    })

        return data_raw, data_suppliers, data_totals, conceptos_list
    except Exception as e:
        print(f"Error procesando {archivo_input}: {e}") # Debug util
        return None, None, None, None


def tarea_subir_archivo(archivo):
    conn = None
    nombre_archivo = getattr(archivo, 'name', str(archivo))
    
    try:
        #print(f"🔍 [DEBUG] Analizando archivo: {nombre_archivo}")
        raw, supp, tots, conc = procesar_factura_completa(archivo)
        
        # Validación básica de lectura
        if not raw or not raw.get('uuid') or not raw['uuid'].strip():
            #print(f"❌ [DEBUG] Falló procesar_factura_completa. Retornó vacío.")
            return False

        uuid_candidato = raw['uuid']
        #print(f"📄 [DEBUG] UUID Extraído: '{uuid_candidato}'")

        if not uuid_candidato or not uuid_candidato.strip():
            #print(f"⚠️ [DEBUG] Salto: UUID inválido o vacío.")
            return False


        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()

        check_sql = "SELECT id FROM vlx_sat_cfdi_raw WHERE uuid = %s LIMIT 1"
        cursor.execute(check_sql, (uuid_candidato,))

        row = cursor.fetchone()
        if row:
            #print(f"🛑 [DEBUG] La BD dice que YA EXISTE. ID encontrado: {row[0]}")
            return False
        else:
            pass
            #print(f"✅ [DEBUG] El UUID es nuevo, procediendo a insertar...")
        
        if not conc or len(conc) == 0:
            raise Exception("⛔ ALERTA CRÍTICA: Se leyó el XML pero no tiene conceptos. Abortando.")

      
     
        conn.autocommit = False # Transacción manual importante
      
        try:
    
            cursor.callproc('sp_vlx_insert_cfdi_raw', [
                limpiar_valor(raw['uuid']), 
                limpiar_valor(raw['fecha']), 
                limpiar_valor(raw['xmlcontent']), 
                0, ''
            ])
            # Limpiar buffer de resultados del procedimiento
            for res in cursor.stored_results(): res.fetchall()

        
            cursor.callproc('sp_insert_suppliers', [
                limpiar_valor(supp['uuid']), limpiar_valor(supp['rfc_emisor']), limpiar_valor(supp['nombre_emisor']),
                limpiar_valor(supp['regimen_fiscal']), limpiar_valor(supp['rfc_receptor']), limpiar_valor(supp['nombre_receptor']),
                limpiar_valor(supp['uso_cfdi']), limpiar_valor(supp['schema_location']), limpiar_valor(supp['uuid_fiscal']),
                limpiar_valor(supp['fecha_timbrado']), limpiar_valor(supp['rfc_prov_certif']), limpiar_valor(supp['sello_cfd']),
                limpiar_valor(supp['no_certificado_sat']), limpiar_valor(supp['sello_sat']),
                0
            ])
            for res in cursor.stored_results(): res.fetchall()

         
            cursor.callproc('sp_insert_total_data', [
                limpiar_valor(tots['uuid']), 
                limpiar_valor(tots['base']),        
                limpiar_valor(tots['base_IVA']),    
                limpiar_valor(tots['importe']),    
                limpiar_valor(tots['sub_total']), 
                limpiar_valor(tots['descuento']),
                limpiar_valor(tots['moneda']),      
                limpiar_valor(tots['tipo_comprobante']), 
                limpiar_valor(tots['metodo_pago']),
                limpiar_valor(tots['forma_pago']), 
                limpiar_valor(tots['total']), 
                0, ''
            ])
            for res in cursor.stored_results(): res.fetchall()

            
            sql_conceptos = """
                INSERT INTO vlx_data_xml (
                    uuid, no_concepto, clave_prod_serv, clave_unidad, cantidad, unidad, 
                    descripcion, valor_unitario, importe, descuento, base, impuesto, 
                    tipo_factor, tasa_cuota, importe_imp
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
        
            # Preparamos el lote de datos
            lote_datos = []
            for c in conc:
                lote_datos.append((
                    limpiar_valor(c['uuid']), 
                    limpiar_valor(c['no_concepto']), 
                    limpiar_valor(c['clave_prod_serv']),
                    limpiar_valor(c['clave_unidad']), 
                    limpiar_valor(c['cantidad']), 
                    limpiar_valor(c['unidad']),
                    limpiar_valor(c['descripcion']), 
                    limpiar_valor(c['valor_unitario']), 
                    limpiar_valor(c['importe']),
                    limpiar_valor(c['descuento']), 
                    limpiar_valor(c['base']), 
                    limpiar_valor(c['impuesto']),
                    limpiar_valor(c['tipo_factor']), 
                    limpiar_valor(c['tasa_cuota']), 
                    limpiar_valor(c['importe_imp'])
                ))
                
            cursor.executemany(sql_conceptos, lote_datos)

            conn.commit()
            #print(f"✅ ¡ÉXITO! UUID: {raw['uuid']}")
            return True

        except mysql.connector.IntegrityError as e:
                conn.rollback() 
                
                if e.errno == 1062:
                    #print(f"🔒 [DEBUG] Bloqueado por DB (IntegrityError 1062 - Duplicado).")
                    return False 
                else:
                    #print(f"❌ Error de integridad extraño en {archivo.name}: {e}")
                    raise e
                
    except Exception as e:
        if conn: conn.rollback()
        #print(f"\n❌ [ERROR CRÍTICO] {nombre_archivo}: {e}")
        return False
    
    finally:
        if conn: conn.close() 




def main_extract(lista_xmls_ram, request=None, MAX_WORKERS=15):
    total = len(lista_xmls_ram)
    if request:
        request.session['import_total'] = total
        request.session['import_current'] = 0
        request.session.modified = True 
        request.session.save()

    print(f"📦 Procesando {len(lista_xmls_ram)} archivos desde RAM con {MAX_WORKERS} hilos...")
    
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        def task_generator():
            while lista_xmls_ram:
                xml_data = lista_xmls_ram.pop(0) 
                archivo_virtual = io.StringIO(xml_data['contenido'])
                archivo_virtual.name = xml_data['nombre']
                yield executor.submit(tarea_subir_archivo, archivo_virtual)

        success = 0
        for i, future in enumerate(as_completed(list(task_generator()))):
            try:
                if future.result():
                    success += 1
                
                if request:
                    request.session['import_current'] = i + 1
                    if (i + 1) % 5 == 0 or (i + 1) == total:
                        request.session.save()
            except Exception as e:
                print(f"❌ Error en hilo: {e}")
                
    return success



if __name__ == "__main__":

    DB_CONFIG = {
    'user': os.getenv("USER_DB"),  
    'password': os.getenv("PASSWORD_DB"),
    'host': os.getenv("HOST_DB"),
    'database': os.getenv("NAME_DB"),
    'port':int(os.getenv("PORT_DB"))
}
    main_extract()
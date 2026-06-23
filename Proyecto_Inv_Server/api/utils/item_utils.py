# api/utils/item_utils.py

import io
from barcode import Code128
from barcode.writer import ImageWriter

def generar_codigo_barras_bytes(sku_texto):

    try:
        buffer = io.BytesIO()
        
        codigo = Code128(sku_texto, writer=ImageWriter())
        
        codigo.write(buffer)
        
        return buffer.getvalue()
        
    except Exception as e:
        print(f"Ocurrió un error al generar el código de barras: {e}")
        return None
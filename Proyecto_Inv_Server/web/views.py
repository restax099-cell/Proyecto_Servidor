from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from api.models.xml_models import VlxTotalDataXml, VlxSatCfdiRaw, VlxSuppliers


def home(request):
    return render(request, "index.html")

@login_required
def emitidos_panel(request):
    return render(request, 'admin_panel_xml/emitidos_panel.html')

@login_required
def recibidos_panel(request):
    return render(request, 'admin_panel_xml/recibidos_panel.html')

@login_required
def conceptos_panel(request, uuid):
    """
    Esta vista renderiza la página de detalle.
    Busca los datos de forma flexible (no falla si falta uno).
    """

    total_data = VlxTotalDataXml.objects.filter(uuid=uuid).first()
    raw_data = VlxSatCfdiRaw.objects.filter(uuid=uuid).first()
    supplier_data = VlxSuppliers.objects.filter(uuid=uuid).first()

    header_data = {
        'emisor': supplier_data.nombre_emisor if supplier_data else 'N/A',
        'rfc_emisor': supplier_data.rfc_emisor if supplier_data else 'N/A',
        'regimen_fiscal_emisor': supplier_data.regimen_fiscal if supplier_data else 'N/A',

        'receptor': supplier_data.nombre_receptor if supplier_data else 'N/A',
        'rfc_receptor': supplier_data.rfc_receptor if supplier_data else 'N/A',
        'uso_cfdi': supplier_data.uso_cfdi if supplier_data else 'N/A',

        'folio_fiscal': uuid,
        'tipo_comprobante': total_data.tipo_comprobante if total_data else 'N/A',
        'fecha': raw_data.fecha if raw_data else None, 
        #!'lugar_expedicion': total_data.lugar_expedicion if total_data else 'N/A',

        'metodo_pago': total_data.metodo_pago if total_data else 'N/A',
        'forma_pago': total_data.forma_pago if total_data else 'N/A',
        
        'sub_total': total_data.sub_total if total_data else 0.0,
        'descuento': total_data.descuento if total_data else 0.0,
        'iva': total_data.importe if total_data else 0.0,
        'total': total_data.total if total_data else 0.0,
    }

    context = {
        'uuid': uuid,
        'header_data': header_data
    }
    
    return render(request, 'admin_panel_xml/conceptos_panel.html', context)
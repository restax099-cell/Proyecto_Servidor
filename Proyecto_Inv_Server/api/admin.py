from django.contrib import admin

from .models.xml_models import (
    VlxSatCfdiRaw, 
    VlxDataXml, 
    VlxTotalDataXml,
)

admin.site.register([VlxSatCfdiRaw, VlxDataXml, VlxTotalDataXml])

#from .models import BarCode

#admin.site.register(BarCode)
# Register your models here.

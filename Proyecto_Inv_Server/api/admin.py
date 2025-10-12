from django.contrib import admin
from rest_framework.authtoken.models import Token

from .models.xml_models import (
    VlxSatCfdiRaw, 
    VlxDataXml, 
    VlxTotalDataXml,
)

admin.site.register([VlxSatCfdiRaw, VlxDataXml, VlxTotalDataXml])

@admin.register(Token)
class TokenAdmin(admin.ModelAdmin):
    list_display = ('key', 'user', 'created')
    search_fields = ('user__username',)

#from .models import BarCode

#admin.site.register(BarCode)
# Register your models here.

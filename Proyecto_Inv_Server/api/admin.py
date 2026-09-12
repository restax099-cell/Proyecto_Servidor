from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from rest_framework.authtoken.models import Token

from .models.xml_models import (
    VlxSatCfdiRaw, 
    VlxDataXml, 
    VlxTotalDataXml,
)
from .models.admin_models import VlxUser

admin.site.register([VlxSatCfdiRaw, VlxDataXml, VlxTotalDataXml])
admin.site.register(VlxUser, UserAdmin)

@admin.register(Token)
class TokenAdmin(admin.ModelAdmin):
    list_display = ('key', 'user', 'created')
    search_fields = ('user__username',)
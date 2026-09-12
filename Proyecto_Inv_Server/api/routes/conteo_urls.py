from django.urls import path
from ..views import conteo_views

urlpatterns = [
    path('get-users/', conteo_views.get_usuarios_conteo, name='get_usuarios_conteo'),
    path('get-stores/', conteo_views.get_stores_conteo, name='get_stores_conteo'),
    path('get-lista-catalogos/', conteo_views.get_lista_catalogos, name='get_lista_catalogos'),
    path('set-conteo-plantilla/', conteo_views.set_conteo_plantilla, name='set_conteo_plantilla'),
    path('get-plantillas/', conteo_views.get_conteo_plantillas, name='get_conteo_plantillas'),

]
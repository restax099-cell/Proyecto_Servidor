from django.urls import path
from . import views 

app_name = 'web' 

urlpatterns = [

    path('', views.home, name='home'), 

    path('emitidos-panel/', views.emitidos_panel, name='emitidos_panel'),
    path('gastos-panel/', views.recibidos_panel, name='recibidos_panel'),

    path('emitidos-panel/conceptos/<str:uuid>/', views.conceptos_panel, name='conceptos_panel'),
    path('recibidos-panel/conceptos/<str:uuid>/', views.conceptos_panel, name='conceptos_panel'),

    path('historial-precios/', views.historial_precios, name='historial_precios'),
    path('xml_import/', views.xml_import, name='xml_import'),
]
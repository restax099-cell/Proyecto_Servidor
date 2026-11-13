from django.urls import path
from . import views 

app_name = 'web' 

urlpatterns = [

    path('', views.home, name='home'), 

    path('cfdi-panel/', views.cfdi_panel, name='cfdi_panel'),

    path('cfdi-panel/conceptos/<str:uuid>/', views.conceptos_cfdi, name='conceptos_panel'),

    path('historial-precios/', views.historial_precios, name='historial_precios'),
    path('xml_import/', views.xml_import, name='xml_import'),

    path('asociacion-panel/', views.asociacion_panel, name='asociacion_panel'),
    path('reporte-panel/', views.report_panel, name='reporte_panel'),

    path('requisicion-panel/', views.requisition_panel, name='requisicion_panel'),
    path('catalog-items/', views.catalog_items, name='catalog_items'),

    path('conteo-plantilla/', views.cont_plant, name='cont_plant'),
    path('cont-panel/', views.cont_panel, name='cont_panel'),
    path('consulta-conteo/', views.consulta_conteo, name='consulta_conteo'),
    path('cont-panel-detalle/<int:plantilla_id>/', views.cont_panel_detalle, name='cont_panel_detalle'),
]
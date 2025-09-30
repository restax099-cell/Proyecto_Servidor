# urls.py (Recomendado)

from django.urls import path
# Importar el módulo views completo
from .views import codes_views, xml_views, prueba_views
# urls.py (Continuación)

urlpatterns = [
    
    # 🚨 Usando el módulo views para llamar a las funciones 🚨
    
    # Rutas de codes_views
    path('get-folio/', codes_views.get_folio_from_url, name='get-folio'),

    # Rutas de xml_views
    path('get-xml/', xml_views.get_xml_file, name='get-xml-file'),
    path('get-xml-data/', xml_views.get_xml_data, name='get-xml-data'),
    path('get-xml-head/', xml_views.get_xml_head, name='get-xml-head'),

    path('get_all_raw/', xml_views.get_all_raw_cfdi, name='get_all_raw_cfdi'),
    path('get_all_data/', xml_views.get_all_data_xml, name='get_all_data_xml'),
    path('get_all_total/', xml_views.get_all_total_data_xml, name='get_all_total_data_xml'),

    # Rutas de prueba_views
    path('get-prueba/', prueba_views.get_prueba, name='get-prueba'),
]
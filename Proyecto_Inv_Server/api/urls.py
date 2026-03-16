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

    path('get-all-raw/', xml_views.get_all_raw_cfdi, name='get-all-raw-cfdi'),
    path('get-all-data/', xml_views.get_all_data_xml, name='get-all-data-xml'),
    path('get-all-total/', xml_views.get_all_total_data_xml, name='get-all-total-data-xml'),

    path('cfdi-consultas/', xml_views.get_cfdi_consultas, name='api_cfdi_consultas'),
    path('history-price/', xml_views.get_precios_historicos, name='get-history-price'),
    path('xml_import/', xml_views.import_xml_zip, name='import_xml_zip'),
    path('get_import_progress/', xml_views.get_import_progress, name='get_import_progress'),

    # Rutas de ITEMS_VIEWS

    path('get-items-sync/', xml_views.get_items_sync_panel, name='get_items_sync'),
    path('get-items-modal/', xml_views.get_items_for_modal, name='get_items_for_modal'),
    path('register-items-association/', xml_views.register_items_association, name='register_items_association'),
    path('unregister-items-association/', xml_views.unregister_items_association, name='unregister_items_association'),
    path('get-dashboard/', xml_views.get_dashboard, name='get_dashboard'),
    path('get-dashboard-details/', xml_views.get_dashboard_detail, name='get_dashboard_detail'),



    # Rutas de prueba_views
    path('get-prueba/', prueba_views.get_prueba, name='get-prueba'),
]
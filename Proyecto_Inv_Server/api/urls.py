# urls.py (Recomendado)
from rest_framework.authtoken.views import obtain_auth_token
from django.urls import path
from django.views.decorators.csrf import csrf_exempt
# Importar el módulo views completo
from .views import (
    codes_views, 
    xml_views, 
    prueba_views, 
    requisicion_views, 
    user_views)

# urls.py (Continuación)

urlpatterns = [
    
    # USERS
    path('login/', csrf_exempt(user_views.AuthToken.as_view()), name='api_login'),

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



    # Rutas para app movil 
    path('set-requisition/', requisicion_views.set_requisition, name='set_requisition'),
    path('get-draft-list/', requisicion_views.get_draft_list, name='get_draft_list'),
    path('get-next-sku/', requisicion_views.get_next_sku, name='get_next_sku'),
    path('set-delivery/', requisicion_views.set_items_delivery, name='set_items_delivery'),
    path('export-requisition-pdf/', requisicion_views.export_requisition_pdf, name='export_requisition_pdf'),
    path('get-items/', requisicion_views.get_items, name='get_items'),
    path('get-categories/', requisicion_views.get_categories, name='get_categories'),
    path('get-pending-count/', requisicion_views.get_pending_count, name='get_pending_count'),
    path('set-insert-item/', requisicion_views.set_insert_item, name='set_insert_item'),
    path('set-complete-item/', requisicion_views.set_complete_ficha_tecnica_item, name='set_complete_ficha_tecnica_item'),




    # Rutas de prueba_views
    path('get-prueba/', prueba_views.get_prueba, name='get-prueba'),
]
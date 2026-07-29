from django.urls import path

from ..views import items_views

urlpatterns = [
    # ==========================================
    # CATÁLOGO PRINCIPAL Y BÚSQUEDAS
    # ==========================================
    path('get-items/', items_views.get_items, name='get_items'),
    path('get-categories/', items_views.get_categories, name='get_categories'),
    path('get-pending-count/', items_views.get_pending_count, name='get_pending_count'),



    path('get-operation-item/', items_views.get_operation_item, name='get_operation_item'),

    path('get-item-complete-ficha/', items_views.get_item_ficha, name='get_item_ficha'),
    path('deactivate-item/', items_views.set_deactivate_item, name='set_deactivate_item'),
    path('get-barcode/', items_views.get_barcode_image, name='get_barcode_image'),
    path('set-category/', items_views.set_save_category, name='set_save_category'),
    path('get-brands/', items_views.get_brands, name='get_brands'),
    path('get-brands-categories/', items_views.get_brands_categories, name='get_brands_categories'),
    path('set-brand/', items_views.set_brand, name='set_brand'),
    path('set-brand-category/', items_views.set_brand_category, name='set_brand_category'),


    
    #? SETTERS
    path('set-insert-item/', items_views.set_insert_item, name='set_insert_item'),
    path('set-complete-item/', items_views.set_complete_ficha_tecnica_item, name='set_complete_ficha_tecnica_item'),
    path('set-operation-item/', items_views.set_operation_item, name='set_operation_item'),

    # ==========================================
    #  VINCULACIÓN CON FACTURAS (XML)
    # ==========================================
    path('get-items-sync/', items_views.get_items_sync_panel, name='get_items_sync'),
    path('get-items-modal/', items_views.get_items_for_modal, name='get_items_for_modal'),
    path('register-items-association/', items_views.register_items_association, name='register_items_association'),
    path('unregister-items-association/', items_views.unregister_items_association, name='unregister_items_association'),
    
]
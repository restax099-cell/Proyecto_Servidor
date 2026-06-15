from django.urls import path

from ..views import items_views

urlpatterns = [
    # ==========================================
    # CATÁLOGO PRINCIPAL Y BÚSQUEDAS
    # ==========================================
    path('get-items/', items_views.get_items, name='get_items'),
    path('get-categories/', items_views.get_categories, name='get_categories'),
    path('get-pending-count/', items_views.get_pending_count, name='get_pending_count'),
    
    # ==========================================
    #  CREACIÓN Y EDICIÓN DE ÍTEMS Y FICHAS
    # ==========================================
    path('set-insert-item/', items_views.set_insert_item, name='set_insert_item'),
    path('set-complete-item/', items_views.set_complete_ficha_tecnica_item, name='set_complete_ficha_tecnica_item'),

    # ==========================================
    #  VINCULACIÓN CON FACTURAS (XML)
    # ==========================================
    path('get-items-sync/', items_views.get_items_sync_panel, name='get_items_sync'),
    path('get-items-modal/', items_views.get_items_for_modal, name='get_items_for_modal'),
    path('register-items-association/', items_views.register_items_association, name='register_items_association'),
    path('unregister-items-association/', items_views.unregister_items_association, name='unregister_items_association'),
    path('get-item-complete-ficha/', items_views.get_item_ficha, name='get_item_ficha'),
    path('deactivate-item/', items_views.set_deactivate_item, name='set_deactivate_item'),
]
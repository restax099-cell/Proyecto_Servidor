from django.urls import path
from ..views import requisicion_views

urlpatterns = [
    # Todas las rutas aquí ya asumen que pertenecen al módulo de requisiciones
    path('set-requisition/', requisicion_views.set_requisition, name='set_requisition'),
    path('get-draft-list/', requisicion_views.get_draft_list, name='get_draft_list'),
    path('get-next-sku/', requisicion_views.get_next_sku, name='get_next_sku'),
    path('set-delivery/', requisicion_views.set_items_delivery, name='set_items_delivery'),
    path('export-requisition-pdf/', requisicion_views.export_requisition_pdf, name='export_requisition_pdf'),

]
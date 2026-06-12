from django.urls import path, include
from django.views.decorators.csrf import csrf_exempt

from .views import (
    codes_views, 
    prueba_views, 
    user_views
)

urlpatterns = [
    # ==========================================
    #  AUTENTICACIÓN Y UTILERÍAS GLOBALES
    # ==========================================
    path('login/', csrf_exempt(user_views.AuthToken.as_view()), name='api_login'),
    path('get-folio/', codes_views.get_folio_from_url, name='get-folio'),
    path('get-prueba/', prueba_views.get_prueba, name='get-prueba'),


    path('items/', include('api.routes.items_urls')),
    
    path('xml/', include('api.routes.xml_urls')),
    
    path('requisition/', include('api.routes.requisiciones_urls')),

]
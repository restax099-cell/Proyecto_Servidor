from django.urls import path
from .views.codes_views import get_folio_from_url
from .views.xml_views import get_xml_data
from .views.prueba_views import get_prueba


urlpatterns = [
    
    path('get-folio/', get_folio_from_url, name='get-folio'),
    path('get-xml/', get_xml_data, name='get-xml-data'),
    path('get-prueba/', get_prueba, name='get-prueba'),
]
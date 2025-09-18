from django.urls import path
from .views.codes_views import get_folio_from_url
from .views.xml_views import (
    get_xml_file,
    get_xml_data,
    get_xml_head
)
from .views.prueba_views import get_prueba


urlpatterns = [
    
    path('get-folio/', get_folio_from_url, name='get-folio'),

    path('get-xml/', get_xml_file, name='get-xml-file'),
    path('get-xml-data/', get_xml_data, name='get-xml-data'),
    path('get-xml-head/', get_xml_head, name='get-xml-head'),

    path('get-prueba/', get_prueba, name='get-prueba'),
]
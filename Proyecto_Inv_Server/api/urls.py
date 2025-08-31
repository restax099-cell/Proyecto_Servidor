from django.urls import path
from .views import codes_views 

urlpatterns = [
    path('get-folio/', codes_views.get_folio_from_url, name='get_folio'),
]
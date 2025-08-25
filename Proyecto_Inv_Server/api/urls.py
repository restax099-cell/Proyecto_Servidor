from django.urls import path
from . import views 

urlpatterns = [
    path('consulta_general/', views.consulta_general, name='consulta-general'),
]
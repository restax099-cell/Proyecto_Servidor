from django.urls import path
from . import views 

urlpatterns = [
    path('consulta_general_test/', views.consulta_general, name='consulta-general-test'),
]
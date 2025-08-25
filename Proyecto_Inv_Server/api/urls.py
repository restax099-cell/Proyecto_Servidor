from django.urls import path
from . import views 

urlpatterns = [
    path('consulta_general_test/', views.consulta_general_test, name='consulta-general-test'),
]
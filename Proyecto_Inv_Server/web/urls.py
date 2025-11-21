from django.urls import path
from . import views 

app_name = 'web' 

urlpatterns = [

    path('', views.home, name='home'), 

    path('admin-panel/', views.admin_panel, name='admin_panel'),
    path('gastos-panel/', views.gastos_panel, name='gastos_panel'),

    path('admin-panel/conceptos/<str:uuid>/', views.conceptos_panel, name='conceptos_panel'),
]
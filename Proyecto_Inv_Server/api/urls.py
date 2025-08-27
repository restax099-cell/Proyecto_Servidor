from django.urls import path
from . import views 

urlpatterns = [
    path('add_barcode/', views.add_barcode, name='add_barcode'),
]
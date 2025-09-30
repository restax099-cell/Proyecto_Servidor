from django.shortcuts import render

def home(request):
    return render(request, "index.html")

def admin_panel(request):
    return render(request, "menu_xml.html")

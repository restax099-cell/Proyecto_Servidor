from django.shortcuts import render
from django.contrib.auth.decorators import login_required

def home(request):
    return render(request, "index.html")

@login_required
def admin_panel(request):
    return render(request, 'admin_panel_xml/main_panel.html')

from django.urls import path
from .views import home, search_reel

urlpatterns = [
    path('', home, name='home'),
    path('api/search/', search_reel),
]
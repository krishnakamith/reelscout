from django.urls import path
from .views import home, search_reel, save_comments_from_browser

urlpatterns = [
    path('', home, name='home'),
    path('api/search/', search_reel),
    path('api/save-comments/', save_comments_from_browser), # <--- The Bridge Endpoint
]
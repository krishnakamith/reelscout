from django.urls import path
from .views import home, search_reel, save_comments_from_browser, location_detail

urlpatterns = [
    path('', home, name='home'),
    path('api/search/', search_reel),
    path('api/save-comments/', save_comments_from_browser),
    path('location/<slug:slug>/', location_detail, name='location-detail'),
]
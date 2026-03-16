from django.urls import path
from .views import home, search_reel, save_comments_from_browser, location_detail, LocationListAPI, LocationDetailAPI, add_location_note, update_nearby_places
from .views import chat

urlpatterns = [
    path('', home, name='home'),
    path('api/search/', search_reel),
    path('api/save-comments/', save_comments_from_browser),
    path('location/<slug:slug>/', location_detail, name='location-detail'),
    path('api/locations/', LocationListAPI.as_view(), name='api-location-list'),
    path('api/locations/<slug:slug>/', LocationDetailAPI.as_view(), name='api-location-detail'),
    path('api/locations/<slug:slug>/notes/', add_location_note, name='api-location-note-add'),
    path('api/locations/<slug:slug>/nearby-places/', update_nearby_places, name='api-location-nearby-places-update'),
    path("api/chat/", chat),
]

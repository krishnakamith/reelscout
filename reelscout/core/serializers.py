from rest_framework import serializers
from .models import Location, ScrapedReel

# 1. First, we translate the Reels
class ScrapedReelSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScrapedReel
        # We only send the data React needs to display the reel cards on the detail page
        fields = ['short_code', 'original_url', 'thumbnail_url', 'author_handle', 'view_count', 'like_count']

# 2. Then, we translate the Location
class LocationSerializer(serializers.ModelSerializer):
    # This automatically grabs all reels connected to this location using the translator above
    reels = ScrapedReelSerializer(many=True, read_only=True)
    
    class Meta:
        model = Location
        # We send the text and map data React needs for the top of the detail page, plus the connected reels
        fields = [
            'id', 'name', 'slug', 'category', 'description', 
            'how_to_reach', 'best_time_to_visit', 'latitude', 'longitude', 'reels'
        ]
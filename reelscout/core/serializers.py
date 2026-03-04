from rest_framework import serializers
from .models import Location, ScrapedReel, LocationRevision

class ScrapedReelSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScrapedReel
        # Added comments_dump and ai_summary for the frontend UI components
        fields = [
            'short_code', 'original_url', 'thumbnail_url', 
            'author_handle', 'view_count', 'like_count',
            'comments_dump', 'ai_summary'
        ]

class LocationRevisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = LocationRevision
        fields = ['id', 'edited_by', 'comment', 'created_at']

class LocationSerializer(serializers.ModelSerializer):
    reels = ScrapedReelSerializer(many=True, read_only=True)
    revisions = LocationRevisionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Location
        # Added extracted_tips to the exposed fields
        fields = [
            'id', 'name', 'slug', 'category', 'description', 
            'how_to_reach', 'best_time_to_visit', 'latitude', 
            'longitude', 'extracted_tips', 'reels', 'revisions'
        ]

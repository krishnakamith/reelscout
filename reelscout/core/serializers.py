from rest_framework import serializers
from .models import Location, ScrapedReel, LocationRevision, ReelFrame


class ReelFrameSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ReelFrame
        fields = ['timestamp', 'image_url']

    def get_image_url(self, obj):
        request = self.context.get('request')
        if not obj.image:
            return None
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url

class ScrapedReelSerializer(serializers.ModelSerializer):
    frames = ReelFrameSerializer(many=True, read_only=True)

    class Meta:
        model = ScrapedReel
        # Added comments_dump and ai_summary for the frontend UI components
        fields = [
            'short_code', 'original_url', 'thumbnail_url',
            'author_handle', 'view_count', 'like_count',
            'comments_dump', 'ai_summary', 'selected_frame_timestamps', 'frames','extracted_general_info', 'extracted_known_facts',
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
        fields = [
            'id', 'name', 'slug', 'category', 'district', 'specific_area', 
            'general_info', 'known_facts', 'latitude', 'longitude', 
            'nearby_places', 'reels', 'revisions'
        ]

import json
from django.contrib import admin
from django.utils.html import format_html
from .models import ScrapedReel, Location, LocationRevision, ReelFrame

@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'last_updated', 'has_ai_tips')
    search_fields = ('name',)
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ('pretty_extracted_tips',)
    
    # Organize fields into sections for a cleaner view
    fieldsets = (
        ('Basic Info', {
            'fields': ('name', 'slug', 'category')
        }),
        ('Content', {
            'fields': ('description', 'how_to_reach', 'best_time_to_visit')
        }),
        ('AI Extracted Data', {
            'fields': ('extracted_tips', 'pretty_extracted_tips')
        }),
        ('Map Data', {
            'fields': ('latitude', 'longitude')
        }),
    )

    def has_ai_tips(self, obj):
        return bool(obj.extracted_tips)
    has_ai_tips.boolean = True
    has_ai_tips.short_description = 'AI Tips Present'

    def pretty_extracted_tips(self, obj):
        """Displays the JSON data cleanly formatted in the admin panel."""
        if obj.extracted_tips:
            formatted_json = json.dumps(obj.extracted_tips, indent=4)
            return format_html('<pre style="background-color: #1e1e1e; color: #d4d4d4; padding: 15px; border-radius: 5px; font-family: monospace;">{}</pre>', formatted_json)
        return "No AI JSON data extracted yet."
    pretty_extracted_tips.short_description = 'Formatted Extracted Tips'

@admin.register(LocationRevision)
class LocationRevisionAdmin(admin.ModelAdmin):
    list_display = ('location', 'edited_by', 'created_at')

class ReelFrameInline(admin.TabularInline):
    model = ReelFrame
    extra = 0
    readonly_fields = ('timestamp', 'image', 'created_at')

@admin.register(ScrapedReel)
class ScrapedReelAdmin(admin.ModelAdmin):
    list_display = ('short_code', 'author_handle', 'location', 'posted_at', 'is_processed')
    list_filter = ('is_processed', 'posted_at', 'location')
    search_fields = ('short_code', 'author_handle')
    inlines = [ReelFrameInline]
    readonly_fields = ('pretty_ai_summary',)

    fieldsets = (
        ('Identifiers & Media', {
            'fields': ('short_code', 'instagram_id', 'original_url', 'video_file', 'audio_file', 'thumbnail_url')
        }),
        ('Text Context', {
            'fields': ('raw_caption', 'transcript_text')
        }),
        ('Metadata & Location', {
            'fields': ('author_handle', 'posted_at', 'instagram_location_name', 'location')
        }),
        ('AI Outputs', {
            'fields': ('is_processed', 'ai_location_name', 'ai_summary', 'pretty_ai_summary')
        }),
    )

    def pretty_ai_summary(self, obj):
        if obj.ai_summary:
            return format_html('<div style="background-color: #f4f6f8; padding: 15px; border-left: 4px solid #4CAF50;">{}</div>', obj.ai_summary)
        return "-"
    pretty_ai_summary.short_description = 'AI Summary View'

@admin.register(ReelFrame)
class ReelFrameAdmin(admin.ModelAdmin):
    list_display = ('reel', 'timestamp', 'created_at')
    list_filter = ('created_at',)
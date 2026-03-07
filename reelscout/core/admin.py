import json
from django.contrib import admin
from django.utils.html import format_html
from .models import ScrapedReel, Location, LocationRevision, ReelFrame

@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'last_updated', 'has_dynamic_data')
    search_fields = ('name',)
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ('pretty_general_info', 'pretty_known_facts')
    
    # Organize fields into sections for a cleaner view
    fieldsets = (
        ('Basic Info', {
            'fields': ('name', 'slug', 'category', 'district', 'specific_area')
        }),
        ('Dynamic JSON Data', {
            'fields': ('general_info', 'pretty_general_info', 'known_facts', 'pretty_known_facts')
        }),
        ('Map Data', {
            'fields': ('latitude', 'longitude')
        }),
    )

    def has_dynamic_data(self, obj):
        return bool(obj.general_info) or bool(obj.known_facts)
    has_dynamic_data.boolean = True
    has_dynamic_data.short_description = 'Dynamic Data Present'

    def pretty_general_info(self, obj):
        if obj.general_info:
            formatted_json = json.dumps(obj.general_info, indent=4)
            return format_html('<pre style="background-color: #1e1e1e; color: #d4d4d4; padding: 15px; border-radius: 5px; font-family: monospace;">{}</pre>', formatted_json)
        return "No general_info data yet."
    pretty_general_info.short_description = 'Formatted general_info'

    def pretty_known_facts(self, obj):
        if obj.known_facts:
            formatted_json = json.dumps(obj.known_facts, indent=4)
            return format_html('<pre style="background-color: #1e1e1e; color: #d4d4d4; padding: 15px; border-radius: 5px; font-family: monospace;">{}</pre>', formatted_json)
        return "No known_facts data yet."
    pretty_known_facts.short_description = 'Formatted known_facts'

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

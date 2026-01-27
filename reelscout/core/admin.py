from django.contrib import admin

# Register your models here.
from .models import ScrapedReel

@admin.register(ScrapedReel)
class ScrapedReelAdmin(admin.ModelAdmin):
    list_display = ('short_code', 'author_handle', 'location_name', 'posted_at')
    search_fields = ('short_code', 'author_handle')
    list_filter = ('is_processed', 'posted_at')

    # This allows you to click the video link directly in the admin
    def location_name(self, obj):
        return obj.instagram_location_name or obj.ai_location_name or "-"
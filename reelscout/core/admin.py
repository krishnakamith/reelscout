from django.contrib import admin
from .models import ScrapedReel, Location, LocationRevision

@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'last_updated')
    search_fields = ('name',)
    prepopulated_fields = {'slug': ('name',)}

@admin.register(LocationRevision)
class LocationRevisionAdmin(admin.ModelAdmin):
    list_display = ('location', 'edited_by', 'created_at')

@admin.register(ScrapedReel)
class ScrapedReelAdmin(admin.ModelAdmin):
    list_display = ('short_code', 'author_handle', 'location', 'posted_at')
    list_filter = ('is_processed', 'posted_at', 'location')
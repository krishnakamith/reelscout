from django.contrib import admin
from .models import ScrapedReel, Location, LocationRevision, ReelFrame

@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'last_updated')
    search_fields = ('name',)
    prepopulated_fields = {'slug': ('name',)}

@admin.register(LocationRevision)
class LocationRevisionAdmin(admin.ModelAdmin):
    list_display = ('location', 'edited_by', 'created_at')

# Added an "Inline" so you can see all frames directly inside the specific Reel's page
class ReelFrameInline(admin.TabularInline):
    model = ReelFrame
    extra = 0
    readonly_fields = ('timestamp', 'image', 'created_at')

@admin.register(ScrapedReel)
class ScrapedReelAdmin(admin.ModelAdmin):
    list_display = ('short_code', 'author_handle', 'location', 'posted_at')
    list_filter = ('is_processed', 'posted_at', 'location')
    search_fields = ('short_code', 'author_handle')
    inlines = [ReelFrameInline]

@admin.register(ReelFrame)
class ReelFrameAdmin(admin.ModelAdmin):
    list_display = ('reel', 'timestamp', 'created_at')
    list_filter = ('created_at',)
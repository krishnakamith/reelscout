from django.db import models
from django.utils.text import slugify

class Location(models.Model):
    # Basic Info
    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    category = models.CharField(max_length=100, help_text="e.g. Waterfall, Cafe, Beach", null=True, blank=True)
    district = models.CharField(max_length=100, null=True, blank=True)
    specific_area = models.CharField(max_length=150, null=True, blank=True)

    # Dynamic JSON Content
    general_info = models.JSONField(default=dict, blank=True, help_text="Dynamic subjective info and vibes")
    known_facts = models.JSONField(default=dict, blank=True, help_text="Dynamic objective data points")

    # Map Data
    nearby_places = models.JSONField(
        default=list, 
        blank=True, 
        help_text="List of nearby places: [{'name': '...', 'type': '...', 'distance': '...'}]"
    )
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    # Metadata
    last_updated = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class ScrapedReel(models.Model):
    # 1. IDENTIFIERS
    short_code = models.CharField(max_length=50, unique=True, db_index=True)
    instagram_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    original_url = models.URLField(max_length=500)

    # 2. MEDIA ASSETS (Stored locally to save money)
    video_file = models.FileField(upload_to='video/', null=True, blank=True)
    # 👇 NEW: Essential for Whisper to access the audio
    audio_file = models.FileField(upload_to='audio/', null=True, blank=True)
    thumbnail_url = models.URLField(max_length=1000, null=True, blank=True)

    # 3. TEXT & CONTEXT
    raw_caption = models.TextField(null=True, blank=True)
    transcript_text = models.TextField(null=True, blank=True)
    comments_dump = models.JSONField(default=list, blank=True, null=True)

    # 4. METADATA
    author_handle = models.CharField(max_length=100, null=True, blank=True)
    posted_at = models.DateTimeField(null=True, blank=True)
    view_count = models.BigIntegerField(default=0)
    like_count = models.BigIntegerField(default=0)

    # 5. EXPLICIT LOCATION (Ground Truth)
    instagram_location_name = models.CharField(max_length=255, null=True, blank=True)

    # 6. AI OUTPUT
    ai_location_name = models.CharField(max_length=255, null=True, blank=True)
    ai_summary = models.TextField(null=True, blank=True)
    selected_frame_timestamps = models.JSONField(default=list, blank=True)

    # 7. STATUS
    is_processed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    location = models.ForeignKey(
        Location,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reels'
    )

    def __str__(self):
        return f"{self.short_code} ({self.author_handle})"

# 👇 NEW MODEL: Stores the extracted frames for Gemini
class ReelFrame(models.Model):
    reel = models.ForeignKey(ScrapedReel, related_name='frames', on_delete=models.CASCADE)
    image = models.ImageField(upload_to='frames/')
    timestamp = models.FloatField(default=0.0) # Stores "At 2.5 seconds"
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.reel.short_code} @ {self.timestamp}s"

class LocationRevision(models.Model):
    location = models.ForeignKey(Location, related_name='revisions', on_delete=models.CASCADE)
    content_snapshot = models.JSONField(help_text="Stores the full description/meta at the time of edit")
    edited_by = models.CharField(max_length=100, default="Anonymous")
    created_at = models.DateTimeField(auto_now_add=True)
    comment = models.CharField(max_length=255, help_text="What was changed?")

    def __str__(self):
        return f"Revision for {self.location.name} at {self.created_at}"

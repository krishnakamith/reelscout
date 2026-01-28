from django.db import models

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
    comments_dump = models.JSONField(default=list, blank=True)

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

    # 7. STATUS
    is_processed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

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
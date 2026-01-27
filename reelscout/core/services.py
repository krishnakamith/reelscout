import re
import requests
from datetime import datetime
from django.conf import settings
from django.core.files.base import ContentFile
from apify_client import ApifyClient
from .models import ScrapedReel
from .video_engine import VideoEngine

def extract_shortcode(url):
    match = re.search(r'/(?:reel|p)/([^/?#&]+)', url)
    return match.group(1) if match else None

def get_or_process_reel(reel_url):
    # 1. CHECK CACHE
    short_code = extract_shortcode(reel_url)
    if not short_code:
        raise ValueError("Invalid Instagram URL")

    existing_reel = ScrapedReel.objects.filter(short_code=short_code).first()
    if existing_reel:
        return existing_reel

    # 2. SCRAPE (Cheap Mode)
    client = ApifyClient(settings.APIFY_TOKEN)
    run_input = {
        "username": [reel_url],
        "includeDownloadedVideo": False, 
        "includeTranscript": False,
        "includeSharesCount": False,
        "commentsLimit": 100
    }
    
    run = client.actor("apify/instagram-reel-scraper").call(run_input=run_input)
    if not run: raise Exception("Scraper failed")

    dataset = client.dataset(run["defaultDatasetId"])
    items = dataset.list_items().items
    if not items: raise Exception("No data found (Private reel?)")
    item = items[0]

    # 3. MANUAL DOWNLOAD (Free Fix)
    video_content = None
    cdn_url = item.get("videoUrl")
    if cdn_url:
        try:
            res = requests.get(cdn_url, timeout=30)
            if res.status_code == 200:
                video_content = ContentFile(res.content)
        except Exception as e:
            print(f"Download Error: {e}")

    # Fix Date
    formatted_date = None
    if item.get("timestamp"):
        try:
            formatted_date = datetime.fromisoformat(item.get("timestamp").replace("Z", "+00:00"))
        except: pass

    # 4. SAVE
    reel, created = ScrapedReel.objects.update_or_create(
        short_code=short_code,
        defaults={
            "instagram_id": item.get("id"),
            "original_url": item.get("url"),
            "raw_caption": item.get("caption"),
            "author_handle": item.get("ownerUsername"),
            "thumbnail_url": item.get("displayUrl"),
            "posted_at": formatted_date,
            "comments_dump": item.get("latestComments", []),
            "view_count": item.get("videoViewCount", 0),
            "like_count": item.get("likesCount", 0),
            "instagram_location_name": item.get("location", {}).get("name") if item.get("location") else None
        }
    )


    if video_content:
        # 1. Save the Video File
        file_name = f"{short_code}.mp4"
        reel.video_file.save(file_name, video_content, save=True)
        
        # 2. Initialize the Engine
        full_video_path = reel.video_file.path 
        engine = VideoEngine(full_video_path, short_code)
        
        # 3. Mine the Data
        engine.extract_frames(interval=2)
        audio_path, transcript = engine.extract_and_transcribe_audio()
        
        # 4. Save Transcript to DB
        reel.transcript_text = transcript
        reel.save()

    return reel
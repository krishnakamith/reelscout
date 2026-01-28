import re
import requests
import json
from datetime import datetime
from django.conf import settings
from django.core.files.base import ContentFile
from apify_client import ApifyClient
from .models import ScrapedReel, ReelFrame
from .video_engine import VideoEngine
from .gemini_service import GeminiService

def extract_shortcode(url):
    match = re.search(r'/(?:reel|p)/([^/?#&]+)', url)
    return match.group(1) if match else None

def get_or_process_reel(reel_url):
    # 1. CHECK CACHE
    short_code = extract_shortcode(reel_url)
    if not short_code: raise ValueError("Invalid Instagram URL")

    existing_reel = ScrapedReel.objects.filter(short_code=short_code).first()
    if existing_reel: return existing_reel

    # 2. SCRAPE (Video + Metadata)
    print(f"🚀 Scraping {short_code}...")
    client = ApifyClient(settings.APIFY_TOKEN)
    
    run_input = {
        "username": [reel_url],
        "includeDownloadedVideo": False, 
        "includeTranscript": False,
        "commentsLimit": 0 
    }
    
    run = client.actor("apify/instagram-reel-scraper").call(run_input=run_input)
    if not run: raise Exception("Scraper failed")

    items = client.dataset(run["defaultDatasetId"]).list_items().items
    if not items: raise Exception("No data found")
    item = items[0]

    # 3. SAVE METADATA
    formatted_date = None
    if item.get("timestamp"):
        try: formatted_date = datetime.fromisoformat(item.get("timestamp").replace("Z", "+00:00"))
        except: pass

    reel, created = ScrapedReel.objects.update_or_create(
        short_code=short_code,
        defaults={
            "instagram_id": item.get("id"),
            "original_url": item.get("url"),
            "raw_caption": item.get("caption"),
            "author_handle": item.get("ownerUsername"),
            "thumbnail_url": item.get("displayUrl"),
            "posted_at": formatted_date,
            "comments_dump": [],
            "view_count": item.get("videoViewCount", 0),
            "like_count": item.get("likesCount", 0),
            "instagram_location_name": item.get("location", {}).get("name") if item.get("location") else None
        }
    )

    # 4. DOWNLOAD & PROCESS MEDIA
    cdn_url = item.get("videoUrl")
    if cdn_url:
        res = requests.get(cdn_url, timeout=30)
        reel.video_file.save(f"{short_code}.mp4", ContentFile(res.content), save=True)
        
        print("⚙️ Processing Media...")
        engine = VideoEngine(reel.video_file.path, short_code)
        
        # A. Extract Frames
        frame_data = engine.extract_frames(interval=2)
        print(f"💾 Saving {len(frame_data)} frames...")
        for f in frame_data:
            ReelFrame.objects.create(reel=reel, image=f['path'], timestamp=f['time'])

        # B. Extract Audio
        audio_path = engine.extract_audio_only()
        if audio_path:
            reel.audio_file.name = audio_path
            reel.save()

        # C. Call Gemini
        print("🧠 Calling Gemini (Transcript + Vision)...")
        ai_service = GeminiService()
        
        full_audio_path = reel.audio_file.path if reel.audio_file else None
        ai_result_json = ai_service.analyze_reel(reel, audio_path=full_audio_path)
        
        if ai_result_json:
            try:
                data = json.loads(ai_result_json)
                reel.transcript_text = data.get("transcript")
                reel.ai_location_name = data.get("location")
                reel.ai_summary = data.get("summary")
                reel.is_processed = True
                reel.save()
                
                print(f"✅ TRANSCRIPT: {reel.transcript_text[:50]}...")
                print(f"📍 LOCATION: {reel.ai_location_name}")
            except Exception as e:
                print(f"⚠️ Failed to parse Gemini JSON: {e}")

    return reel
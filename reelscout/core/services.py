import re
import os
import json
import requests
from datetime import datetime
from django.conf import settings
from django.core.files.base import ContentFile
from apify_client import ApifyClient
from instagrapi import Client
from .models import ScrapedReel, ReelFrame
from .video_engine import VideoEngine
from .gemini_service import GeminiService

# --- INSTAGRAPI SESSION MANAGER ---
def get_instagram_client():
    """
    Returns a logged-in Instagrapi Client.
    Uses 'session.json' to reuse cookies (Anti-Ban protection).
    """
    cl = Client()
    session_file = "session.json"
    
    user = os.getenv("INSTAGRAM_USER")
    password = os.getenv("INSTAGRAM_PASSWORD")

    if not user or not password:
        print("⚠️ Missing INSTAGRAM_USER or INSTAGRAM_PASSWORD in .env")
        return None

    # 1. Try to load existing session
    if os.path.exists(session_file):
        try:
            print("🔄 Loading Instagram session from file...")
            cl.load_settings(session_file)
            cl.login(user, password) 
            print("✅ Session valid.")
            return cl
        except Exception as e:
            print(f"⚠️ Session invalid, logging in fresh... ({e})")

    # 2. Fresh Login
    try:
        print(f"🔐 Logging in as {user}...")
        cl.login(user, password)
        cl.dump_settings(session_file) # Save cookies
        print("✅ Login successful & session saved.")
        return cl
    except Exception as e:
        print(f"❌ Instagram Login Failed: {e}")
        return None

def get_top_comments_text_only(reel_url, limit=100):
    """
    Fetches the top 10 most liked comments + replies.
    Returns ONLY a list of text strings.
    """
    cl = get_instagram_client()
    if not cl: return []

    try:
        # 1. Get Media ID
        media_pk = cl.media_pk_from_url(reel_url)
        print(f"💬 Fetching recent {limit} comments for ID: {media_pk}...")

        # 2. Fetch & Sort
        comments = cl.media_comments(media_pk, amount=limit)
        sorted_comments = sorted(comments, key=lambda c: c.like_count, reverse=True)
        top_batch = sorted_comments[:10]
        
        # 3. Extract CLEAN TEXT
        text_list = []
        print(f"🕵️ Extracting text from top {len(top_batch)} conversations...")
        
        for c in top_batch:
            # Add the parent comment text
            if c.text:
                text_list.append(c.text.strip())
            
            # Add reply texts (if any)
            if c.child_comment_count > 0:
                try:
                    replies = cl.media_comment_answers(media_pk, c.pk)
                    for r in replies:
                        if r.text:
                            text_list.append(r.text.strip())
                except Exception as e:
                    print(f"⚠️ Error fetching reply: {e}")

        print(f"✅ Captured {len(text_list)} text snippets.")
        return text_list

    except Exception as e:
        print(f"❌ Comment Scraping Error: {e}")
        return []

# --- MAIN LOGIC ---

def extract_shortcode(url):
    match = re.search(r'/(?:reel|p)/([^/?#&]+)', url)
    return match.group(1) if match else None

def get_or_process_reel(reel_url):
    short_code = extract_shortcode(reel_url)
    if not short_code: raise ValueError("Invalid Instagram URL")

    existing_reel = ScrapedReel.objects.filter(short_code=short_code).first()
    if existing_reel: return existing_reel

    # 1. SCRAPE VIDEO (Apify)
    print(f"🚀 Scraping Video Data for {short_code}...")
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

    # Save Metadata
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

    # 2. DOWNLOAD & PROCESS MEDIA
    cdn_url = item.get("videoUrl")
    if cdn_url:
        res = requests.get(cdn_url, timeout=30)
        reel.video_file.save(f"{short_code}.mp4", ContentFile(res.content), save=True)
        
        print("⚙️ Processing Media...")
        engine = VideoEngine(reel.video_file.path, short_code)
        
        # A. Frames
        frame_data = engine.extract_frames(interval=2)
        print(f"💾 Saving {len(frame_data)} frames...")
        for f in frame_data:
            ReelFrame.objects.create(reel=reel, image=f['path'], timestamp=f['time'])

        # B. Audio
        audio_path = engine.extract_audio_only()
        if audio_path:
            reel.audio_file.name = audio_path
            reel.save()

        # C. FETCH COMMENTS (Text Only)
        if not reel.comments_dump:
            print("💬 Starting Text-Only Comment Search...")
            # Returns a simple list: ["Cool!", "Where?", "Munnar"]
            comments_text_list = get_top_comments_text_only(reel_url, limit=100)
            reel.comments_dump = comments_text_list
            reel.save()

        # D. GEMINI ANALYSIS
        print("🧠 Calling Gemini...")
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
            except Exception as e:
                print(f"⚠️ Failed to parse Gemini JSON: {e}")

    return reel
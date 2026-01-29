import re
import os
import json
import requests
import instaloader  # <--- Switched to Instaloader
from datetime import datetime
from django.conf import settings
from django.core.files.base import ContentFile
from apify_client import ApifyClient
from .models import ScrapedReel, ReelFrame
from .video_engine import VideoEngine
from .gemini_service import GeminiService

# --- INSTALOADER SESSION MANAGER ---
def get_instaloader_instance():
    """
    Returns a loaded Instaloader instance using the saved session file.
    """
    print("\n--- 🔐 STARTING INSTALOADER SESSION ---")
    
    # 1. Configure for speed (skip downloading images/videos)
    L = instaloader.Instaloader(
        download_pictures=False,
        download_videos=False, 
        download_video_thumbnails=False,
        download_geotags=False,
        download_comments=False,
        save_metadata=False,
        compress_json=False
    )
    
    user = os.getenv("INSTAGRAM_USER")
    if not user:
        print("❌ ERROR: INSTAGRAM_USER not found in .env")
        return None

    # 2. Construct Session Path
    # Instaloader saves sessions as "session-<username>"
    session_filename = f"session-{user}"
    session_path = os.path.join(settings.BASE_DIR, session_filename)
    
    print(f"📂 Looking for session file: {session_path}")

    # 3. Load Session
    if os.path.exists(session_path):
        try:
            print("🔄 Loading session from file...")
            L.load_session_from_file(user, filename=session_path)
            print("✅ Session loaded successfully.")
            return L
        except Exception as e:
            print(f"⚠️ Failed to load session: {e}")
            print("👉 Tip: Run 'python setup_session.py' to regenerate it.")
    else:
        print("⚠️ Session file not found!")
        print(f"👉 Please run the 'setup_session.py' script first to create '{session_filename}'.")
        print("⚠️ Attempting anonymous access (Likely to fail for comments)...")
        
    return L

def get_comments_instaloader(short_code, limit=100):
    """
    Fetches comments using Instaloader and returns a list of strings.
    """
    print(f"\n--- 💬 STARTING INSTALOADER SCRAPER ({limit} limit) ---")
    
    L = get_instaloader_instance()
    if not L: return []

    clean_comments = []
    
    try:
        # 1. Get Post
        print(f"🔗 Resolving Post for shortcode: {short_code}...")
        post = instaloader.Post.from_shortcode(L.context, short_code)
        
        print(f"📥 Fetching comments...")
        
        # 2. Iterate Comments
        # Instaloader iterator is lazy. We must manually count/break.
        count = 0
        
        # get_comments() returns top-level comments
        for comment in post.get_comments():
            if count >= limit:
                break
            
            # Parent Text
            text = comment.text.strip()
            if text:
                clean_comments.append(text)
                
            # Replies (Instaloader calls them 'answers')
            # Fetching replies is an extra API call per comment.
            # We limit this to avoid rate limits.
            if comment.answers_count > 0:
                try:
                    for answer in comment.answers:
                        reply_text = answer.text.strip()
                        if reply_text:
                            clean_comments.append(reply_text)
                        
                        # Hard limit on total comments to prevent infinite loops
                        if len(clean_comments) >= limit:
                            break
                except Exception as e:
                    print(f"⚠️ Error fetching reply: {e}")

            count += 1
            if len(clean_comments) >= limit:
                break

        print(f"📦 Final Count: {len(clean_comments)} comments captured.")
        return clean_comments

    except Exception as e:
        print(f"❌ INSTALOADER ERROR: {e}")
        return []

# --- MAIN LOGIC (Unchanged) ---

def extract_shortcode(url):
    match = re.search(r'/(?:reel|p)/([^/?#&]+)', url)
    return match.group(1) if match else None

def get_or_process_reel(reel_url):
    short_code = extract_shortcode(reel_url)
    if not short_code: raise ValueError("Invalid Instagram URL")

    existing_reel = ScrapedReel.objects.filter(short_code=short_code).first()
    if existing_reel: return existing_reel

    # 1. SCRAPE VIDEO (Apify)
    print(f"\n🚀 STEP 1: Scraping Video Data for {short_code}...")
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
        print("\n⚙️ STEP 2: Processing Media...")
        res = requests.get(cdn_url, timeout=30)
        reel.video_file.save(f"{short_code}.mp4", ContentFile(res.content), save=True)
        
        engine = VideoEngine(reel.video_file.path, short_code)
        
        # Frames
        frame_data = engine.extract_frames(interval=2)
        print(f"💾 Saving {len(frame_data)} frames...")
        for f in frame_data:
            ReelFrame.objects.create(reel=reel, image=f['path'], timestamp=f['time'])

        # Audio
        audio_path = engine.extract_audio_only()
        if audio_path:
            reel.audio_file.name = audio_path
            reel.save()

        # C. FETCH COMMENTS (Instaloader)
        if not reel.comments_dump:
            print("\n⚙️ STEP 3: Starting Instaloader Comment Search...")
            
            comments_text_list = get_comments_instaloader(short_code, limit=100)
            
            print(f"🛑 DEBUG: Scraper returned {len(comments_text_list)} items.")
            print(f"🛑 DEBUG: Sample: {comments_text_list[:3]}")

            if comments_text_list:
                reel.comments_dump = comments_text_list
                reel.save()
                print("💾 SAVED comments to Database.")
            else:
                print("⚠️ WARNING: Empty list returned. Check if session file exists.")

        # D. GEMINI ANALYSIS
        print("\n🧠 STEP 4: Calling Gemini...")
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
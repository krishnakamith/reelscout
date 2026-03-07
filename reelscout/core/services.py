import re
import requests
import json
from datetime import datetime
from django.conf import settings
from django.core.files.base import ContentFile
from apify_client import ApifyClient
from .models import ScrapedReel, ReelFrame, Location  # Added Location import
from .video_engine import VideoEngine
from .gemini_service import GeminiService

def extract_shortcode(url):
    match = re.search(r'/(?:reel|p)/([^/?#&]+)', url)
    return match.group(1) if match else None

def _as_dict(value):
    return value if isinstance(value, dict) else {}

def _merge_dynamic_data(current, incoming):
    merged = _as_dict(current).copy()
    for key, value in _as_dict(incoming).items():
        if value is None:
            continue
        if isinstance(value, str) and not value.strip():
            continue
        merged[str(key)] = value
    return merged

def get_or_process_reel(reel_url):
    # 1. CHECK REEL CACHE
    short_code = extract_shortcode(reel_url)
    if not short_code: raise ValueError("Invalid Instagram URL")

    existing_reel = ScrapedReel.objects.filter(short_code=short_code).first()
    # Return existing reel if it has already been processed
    if existing_reel and existing_reel.is_processed:
        return existing_reel

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

    # 3. SAVE INITIAL REEL DATA
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
        for f in frame_data:
            ReelFrame.objects.create(reel=reel, image=f['path'], timestamp=f['time'])

        # B. Extract Audio
        audio_path = engine.extract_audio_only()
        if audio_path:
            reel.audio_file.name = audio_path
            reel.save()

        # 5. CALL GEMINI & LINK TO LOCATION
        print("🧠 Calling Gemini (Transcript + Vision)...")
        ai_service = GeminiService()

        full_audio_path = reel.audio_file.path if reel.audio_file else None
        ai_result_json = ai_service.analyze_reel(reel, audio_path=full_audio_path)

        if ai_result_json:
            try:
                data = json.loads(ai_result_json)
                loc_name = data.get("location")
                district = data.get("district")
                specific_area = data.get("specific_area")
                general_info = _as_dict(data.get("general_info"))
                known_facts = _as_dict(data.get("known_facts"))

                # Check for existing location or create a new one.
                if loc_name:
                    location_obj, loc_created = Location.objects.get_or_create(
                        name=loc_name,
                        defaults={
                            'category': data.get('category', 'Uncategorized'),
                            'district': district,
                            'specific_area': specific_area,
                            'latitude': data.get('latitude'),
                            'longitude': data.get('longitude'),
                            'general_info': general_info,
                            'known_facts': known_facts,
                        }
                    )

                    # Merge dynamic dictionaries and fill any missing metadata.
                    if not loc_created:
                        has_updates = False

                        merged_general_info = _merge_dynamic_data(location_obj.general_info, general_info)
                        if merged_general_info != (location_obj.general_info or {}):
                            location_obj.general_info = merged_general_info
                            has_updates = True

                        merged_known_facts = _merge_dynamic_data(location_obj.known_facts, known_facts)
                        if merged_known_facts != (location_obj.known_facts or {}):
                            location_obj.known_facts = merged_known_facts
                            has_updates = True

                        if district and not location_obj.district:
                            location_obj.district = district
                            has_updates = True

                        if specific_area and not location_obj.specific_area:
                            location_obj.specific_area = specific_area
                            has_updates = True

                        latitude = data.get("latitude")
                        longitude = data.get("longitude")
                        if latitude and not location_obj.latitude:
                            location_obj.latitude = latitude
                            has_updates = True
                        if longitude and not location_obj.longitude:
                            location_obj.longitude = longitude
                            has_updates = True

                        if has_updates:
                            location_obj.save()

                    reel.location = location_obj

                reel.transcript_text = data.get("transcript")
                reel.ai_location_name = loc_name
                reel.ai_summary = (
                    data.get("summary")
                    or data.get("transcript")
                    or reel.ai_summary
                )
                reel.is_processed = True
                reel.save()

                print(f"✅ TRANSCRIPT: {reel.transcript_text[:50]}...")
                print(f"📍 LINKED TO LOCATION: {reel.location.name if reel.location else 'None'}")
            except Exception as e:
                print(f"⚠️ Failed to parse Gemini JSON: {e}")

    return reel

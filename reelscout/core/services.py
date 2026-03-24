import re
import math
import os
import requests
import json
import time
from difflib import SequenceMatcher
from datetime import datetime
from django.conf import settings
from django.core.files.base import ContentFile
from apify_client import ApifyClient
from .models import ScrapedReel, ReelFrame, Location
from .video_engine import VideoEngine
from .gemini_service import GeminiService
from core.rag.index_updater import add_reel_to_index
from core.rag.add_frames_to_index import add_frames_to_index

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculates the great-circle distance in meters between two coordinates."""
    R = 6371000 # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def extract_shortcode(url):
    match = re.search(r'/(?:reel|p)/([^/?#&]+)', url)
    return match.group(1) if match else None

def _as_dict(value):
    return value if isinstance(value, dict) else {}

def _normalize_location_name(value):
    text = str(value or "").strip().lower()
    if not text:
        return ""
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    token_map = {
        "falls": "waterfall",
        "fall": "waterfall",
        "waterfalls": "waterfall",
        "st": "saint",
        "mt": "mount",
    }
    tokens = [token_map.get(token, token) for token in text.split()]
    return " ".join(tokens)

def _normalize_geo_label(value):
    text = str(value or "").strip().lower()
    if not text:
        return ""
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def _clean_text_value(value):
    text = str(value or "").strip()
    return text or None

def _clean_aliases(aliases, canonical_name=None):
    names = aliases if isinstance(aliases, list) else []
    canonical_norm = _normalize_location_name(canonical_name)
    cleaned = []
    seen = set()

    for raw_name in names:
        name = str(raw_name or "").strip()
        if not name:
            continue

        norm = _normalize_location_name(name)
        if not norm or norm == canonical_norm or norm in seen:
            continue

        seen.add(norm)
        cleaned.append(name)

    return cleaned

def _merge_aliases(existing_aliases, new_aliases, canonical_name=None):
    merged = list(existing_aliases or []) + list(new_aliases or [])
    return _clean_aliases(merged, canonical_name=canonical_name)

def _iter_location_name_variants(location):
    variants = [location.name]
    if isinstance(location.alternate_names, list):
        variants.extend(location.alternate_names)
    return variants

def _find_location_by_any_name(target_name, district=None):
    target_norm = _normalize_location_name(target_name)
    if not target_norm:
        return None

    all_locations = list(Location.objects.all())

    # 1) Exact normalized match against canonical + alternate names.
    for location in all_locations:
        for variant in _iter_location_name_variants(location):
            if _normalize_location_name(variant) == target_norm:
                return location

    # 2) Fuzzy fallback for minor name variations.
    best_match = None
    best_score = 0.0
    district_norm = str(district or "").strip().lower()

    for location in all_locations:
        same_district = bool(
            district_norm
            and location.district
            and location.district.strip().lower() == district_norm
        )
        threshold = 0.86 if same_district else 0.91

        for variant in _iter_location_name_variants(location):
            variant_norm = _normalize_location_name(variant)
            if not variant_norm:
                continue

            score = SequenceMatcher(None, target_norm, variant_norm).ratio()
            if (
                (target_norm in variant_norm or variant_norm in target_norm)
                and min(len(target_norm), len(variant_norm)) >= 8
            ):
                score = max(score, 0.90)

            if score >= threshold and score > best_score:
                best_match = location
                best_score = score

    return best_match

def _merge_dynamic_data(current, incoming):
    merged = _as_dict(current).copy()
    for key, value in _as_dict(incoming).items():
        if value is None:
            continue
        if isinstance(value, str) and not value.strip():
            continue
        merged[str(key)] = value
    return merged

def _infer_category(location_name):
    name = str(location_name or "").lower()
    rules = (
        ("waterfall", "Waterfall"),
        ("falls", "Waterfall"),
        ("beach", "Beach"),
        ("temple", "Temple"),
        ("church", "Church"),
        ("mosque", "Mosque"),
        ("fort", "Fort"),
        ("dam", "Dam"),
        ("lake", "Lake"),
        ("hill", "Hill Station"),
        ("cave", "Cave"),
        ("park", "Park"),
        ("view point", "Viewpoint"),
        ("viewpoint", "Viewpoint"),
    )
    for key, category in rules:
        if key in name:
            return category
    return None

def _sanitize_selected_frame_timestamps(raw_value):
    if not isinstance(raw_value, list):
        return []

    cleaned = []
    for item in raw_value:
        try:
            value = round(float(item), 2)
        except (TypeError, ValueError):
            continue
        if value >= 0:
            cleaned.append(value)

    unique = []
    seen = set()
    for value in cleaned:
        if value in seen:
            continue
        seen.add(value)
        unique.append(value)

    return unique[:4]

def _extract_comment_text(raw_comment):
    if isinstance(raw_comment, dict):
        text = str(raw_comment.get("text", "")).strip()
    else:
        text = str(raw_comment or "").strip()
    if text.lower() == "[object object]":
        return ""
    return text

def _iter_comment_texts(comments_dump):
    if not isinstance(comments_dump, list):
        return
    for raw_comment in comments_dump:
        text = _extract_comment_text(raw_comment)
        if text:
            yield text

def _add_vote(scores, labels, value, weight=1):
    label = _clean_text_value(value)
    if not label:
        return
    normalized = _normalize_geo_label(label)
    if not normalized:
        return
    scores[normalized] = scores.get(normalized, 0) + weight
    labels.setdefault(normalized, label)

def _has_usable_comments(comments_dump):
    if not isinstance(comments_dump, list):
        return False
    for _ in _iter_comment_texts(comments_dump):
        return True
    return False

def _contains_geo_mention(text, candidate):
    if not text or not candidate:
        return False
    return f" {candidate} " in f" {text} "

def _extract_area_hints_from_names(names, canonical_location_name=None):
    hints = []
    seen = set()
    canonical_norm = _normalize_geo_label(canonical_location_name)
    strip_tokens = {
        "temple", "church", "mosque", "fort", "waterfall", "falls", "lake",
        "dam", "beach", "cave", "hill", "hills", "viewpoint", "view", "point",
    }

    for raw_name in names or []:
        name = _clean_text_value(raw_name)
        if not name:
            continue

        tokens = [token for token in _normalize_geo_label(name).split() if token not in strip_tokens]
        if not tokens:
            continue

        candidate_norm = " ".join(tokens).strip()
        if not candidate_norm:
            continue
        if canonical_norm and (
            candidate_norm in canonical_norm
            or canonical_norm in candidate_norm
        ):
            continue
        if candidate_norm in seen:
            continue

        seen.add(candidate_norm)
        hints.append(" ".join(token.capitalize() for token in tokens))

    return hints

def _pick_consensus_geo_value(
    existing_reels,
    incoming_values,
    current_value,
    incoming_comments,
    reel_field,
    fallback_fields=None,
):
    # Evidence priority:
    # 1) Reel-derived fields (caption/transcript-driven AI extraction)
    # 2) Fallback reel fields (e.g., instagram location tags)
    # 3) Comment mentions
    primary_reel_weight = 3
    fallback_reel_weight = 2
    incoming_primary_weight = 4
    current_value_weight = 2
    comment_weight = 1

    reel_scores = {}
    comment_scores = {}
    labels = {}
    fallback_fields = list(fallback_fields or [])

    for existing_reel in existing_reels:
        primary_value = getattr(existing_reel, reel_field, None)
        if primary_value:
            _add_vote(reel_scores, labels, primary_value, weight=primary_reel_weight)
        for field_name in fallback_fields:
            _add_vote(
                reel_scores,
                labels,
                getattr(existing_reel, field_name, None),
                weight=fallback_reel_weight,
            )

    for item in incoming_values or []:
        if isinstance(item, tuple) and len(item) == 2:
            value, weight = item
            _add_vote(reel_scores, labels, value, weight=weight)
        else:
            _add_vote(reel_scores, labels, item, weight=incoming_primary_weight)
    _add_vote(reel_scores, labels, current_value, weight=current_value_weight)

    candidates = set(reel_scores.keys())
    if not candidates:
        return _clean_text_value(current_value)

    for existing_reel in existing_reels:
        normalized_comments = [
            _normalize_geo_label(comment_text)
            for comment_text in _iter_comment_texts(existing_reel.comments_dump)
        ]
        for candidate in candidates:
            if len(candidate) < 4:
                continue
            if any(_contains_geo_mention(comment, candidate) for comment in normalized_comments):
                comment_scores[candidate] = comment_scores.get(candidate, 0) + comment_weight

    incoming_normalized_comments = [
        _normalize_geo_label(comment_text)
        for comment_text in _iter_comment_texts(incoming_comments)
    ]
    for candidate in candidates:
        if len(candidate) < 4:
            continue
        if any(_contains_geo_mention(comment, candidate) for comment in incoming_normalized_comments):
            comment_scores[candidate] = comment_scores.get(candidate, 0) + comment_weight

    total_scores = {
        candidate: reel_scores.get(candidate, 0) + comment_scores.get(candidate, 0)
        for candidate in candidates
    }
    best_total = max(total_scores.values())
    top_candidates = [candidate for candidate, score in total_scores.items() if score == best_total]

    current_normalized = _normalize_geo_label(current_value)
    if current_normalized in top_candidates:
        selected = current_normalized
    else:
        top_candidates.sort(
            key=lambda candidate: (
                -reel_scores.get(candidate, 0),
                -comment_scores.get(candidate, 0),
                candidate,
            )
        )
        selected = top_candidates[0]

    return labels.get(selected, _clean_text_value(current_value))

def get_or_process_reel(reel_url, prepared_comments=None):
    # 1. CHECK REEL CACHE
    short_code = extract_shortcode(reel_url)
    if not short_code: raise ValueError("Invalid Instagram URL")

    existing_reel = ScrapedReel.objects.filter(short_code=short_code).first()
    has_prepared_comments = bool(prepared_comments and len(prepared_comments) > 0)
    has_existing_usable_comments = bool(
        existing_reel and _has_usable_comments(existing_reel.comments_dump)
    )
    if existing_reel and existing_reel.is_processed and not (
        has_prepared_comments and not has_existing_usable_comments
    ):
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

    reel_defaults = {
        "instagram_id": item.get("id"),
        "original_url": item.get("url"),
        "raw_caption": item.get("caption"),
        "author_handle": item.get("ownerUsername"),
        "thumbnail_url": item.get("displayUrl"),
        "posted_at": formatted_date,
        "view_count": item.get("videoViewCount", 0),
        "like_count": item.get("likesCount", 0),
        "instagram_location_name": item.get("location", {}).get("name") if item.get("location") else None,
    }
    if has_prepared_comments:
        reel_defaults["comments_dump"] = prepared_comments

    reel, created = ScrapedReel.objects.update_or_create(
        short_code=short_code,
        defaults=reel_defaults
    )

    # 4. DOWNLOAD & PROCESS MEDIA
    cdn_url = item.get("videoUrl")
    if cdn_url:
        res = requests.get(cdn_url, timeout=30)
        reel.video_file.save(f"{short_code}.mp4", ContentFile(res.content), save=True)

        print("⚙️ Processing Media...")
        engine = VideoEngine(reel.video_file.path, short_code)

        # A. Extract Frames
        reel.frames.all().delete()
        frame_data = engine.extract_frames(interval=2)
        for f in frame_data:
            ReelFrame.objects.create(reel=reel, image=f['path'], timestamp=f['time'])

        # B. Extract Audio
        audio_path = engine.extract_audio_only()
        if audio_path:
            reel.audio_file.name = audio_path
            reel.save()

        if has_prepared_comments:
            print("✅ Using comments provided with request.")
        else:
            print("⏳ Waiting for comments from the browser script...")
            max_attempts = 15
            for attempt in range(max_attempts):
                reel.refresh_from_db()
                if _has_usable_comments(reel.comments_dump):
                    print("✅ Comments received! Proceeding to AI analysis.")
                    break
                time.sleep(2)
            else:
                print("⚠️ No comments received within the timeout limit. Proceeding without comments.")

        # 5. CALL GEMINI & LINK TO LOCATION
        print("🧠 Calling Gemini (Transcript + Vision + Comments)...")
        ai_service = GeminiService()

        full_audio_path = reel.audio_file.path if reel.audio_file else None
        ai_result_json = ai_service.analyze_reel(reel, audio_path=full_audio_path)

        if ai_result_json:
            try:
                data = json.loads(ai_result_json)
                loc_name = data.get("location")
                ai_alternate_names = data.get("alternate_names", [])
                category = data.get("category")
                district = _clean_text_value(data.get("district"))
                specific_area = _clean_text_value(data.get("specific_area"))
                latitude = data.get("latitude")
                longitude = data.get("longitude")
                general_info = _as_dict(data.get("general_info"))
                known_facts = _as_dict(data.get("known_facts"))

                if loc_name:
                    resolved_category = category or _infer_category(loc_name) or "Uncategorized"
                    
                    location_obj = None

                    # 1. Primary AI Name Match
                    location_obj = _find_location_by_any_name(loc_name, district=district)
                    
                    # 2. Instagram Ground Truth Name Match
                    if not location_obj and reel.instagram_location_name:
                        location_obj = _find_location_by_any_name(reel.instagram_location_name, district=district)

                    # 3. AI Extracted Alternate Name Match
                    if not location_obj and ai_alternate_names:
                        for alt_name in ai_alternate_names:
                            location_obj = _find_location_by_any_name(alt_name, district=district)
                            if location_obj:
                                print(f"📍 MATCH: Found location via extracted alternate name '{alt_name}'")
                                break

                    # 4. Spatial Clustering Fallback (Within 500m) with AI Verification
                    if not location_obj and latitude is not None and longitude is not None:
                        lat_tol, lon_tol = 0.01, 0.01
                        nearby_candidates = Location.objects.filter(
                            latitude__isnull=False,
                            longitude__isnull=False,
                            latitude__range=(float(latitude) - lat_tol, float(latitude) + lat_tol),
                            longitude__range=(float(longitude) - lon_tol, float(longitude) + lon_tol)
                        )
                        for candidate in nearby_candidates:
                            dist = haversine_distance(
                                float(latitude), float(longitude), 
                                float(candidate.latitude), float(candidate.longitude)
                            )
                            if dist <= 500: # 500 meters threshold
                                is_same_place = ai_service.verify_location_merge(
                                    new_name=loc_name,
                                    new_category=resolved_category,
                                    new_info=general_info,
                                    existing_location=candidate,
                                    distance=dist
                                )
                                
                                if is_same_place:
                                    location_obj = candidate
                                    print(f"📍 MERGE APPROVED: AI confirmed '{loc_name}' is the same as '{candidate.name}' (Distance: {dist:.1f}m)")
                                    break
                                else:
                                    print(f"🛑 MERGE REJECTED: AI confirmed '{loc_name}' is distinct from '{candidate.name}' despite being {dist:.1f}m away.")

                    # Compile all discovered names for the database
                    names_to_store = [loc_name, reel.instagram_location_name] + ai_alternate_names
                    names_to_store = [n for n in names_to_store if n] # Filter out None values

                    if not location_obj:
                        discovered_aliases = _clean_aliases(names_to_store, canonical_name=loc_name)
                        location_obj = Location.objects.create(
                            name=loc_name,
                            category=resolved_category,
                            district=district,
                            specific_area=specific_area,
                            latitude=latitude,
                            longitude=longitude,
                            general_info=general_info,
                            known_facts=known_facts,
                            alternate_names=discovered_aliases,
                        )
                        loc_created = True
                    else:
                        loc_created = False

                    if not loc_created:
                        has_updates = False

                        existing_reels = list(
                            location_obj.reels.exclude(id=reel.id).only(
                                "comments_dump",
                                "extracted_district",
                                "extracted_specific_area",
                                "instagram_location_name",
                            )
                        )

                        merged_aliases = _merge_aliases(
                            location_obj.alternate_names,
                            names_to_store,
                            canonical_name=location_obj.name,
                        )
                        if merged_aliases != (location_obj.alternate_names or []):
                            location_obj.alternate_names = merged_aliases
                            has_updates = True

                        merged_general_info = _merge_dynamic_data(location_obj.general_info, general_info)
                        if merged_general_info != (location_obj.general_info or {}):
                            location_obj.general_info = merged_general_info
                            has_updates = True

                        merged_known_facts = _merge_dynamic_data(location_obj.known_facts, known_facts)
                        if merged_known_facts != (location_obj.known_facts or {}):
                            location_obj.known_facts = merged_known_facts
                            has_updates = True

                        if (not location_obj.category) or location_obj.category.strip().lower() == "uncategorized":
                            inferred = category or _infer_category(loc_name)
                            if inferred:
                                location_obj.category = inferred
                                has_updates = True

                        if category and not location_obj.category:
                            location_obj.category = category
                            has_updates = True

                        consensus_district = _pick_consensus_geo_value(
                            existing_reels=existing_reels,
                            incoming_values=[(district, 4)],
                            current_value=location_obj.district,
                            incoming_comments=reel.comments_dump,
                            reel_field="extracted_district",
                        )
                        if consensus_district != _clean_text_value(location_obj.district):
                            location_obj.district = consensus_district
                            has_updates = True

                        specific_area_hints = _extract_area_hints_from_names(
                            names=names_to_store,
                            canonical_location_name=location_obj.name,
                        )
                        incoming_specific_area_values = [(specific_area, 4)] + [
                            (hint, 1) for hint in specific_area_hints
                        ]

                        consensus_specific_area = _pick_consensus_geo_value(
                            existing_reels=existing_reels,
                            incoming_values=incoming_specific_area_values,
                            current_value=location_obj.specific_area,
                            incoming_comments=reel.comments_dump,
                            reel_field="extracted_specific_area",
                            fallback_fields=["instagram_location_name"],
                        )
                        if consensus_specific_area != _clean_text_value(location_obj.specific_area):
                            location_obj.specific_area = consensus_specific_area
                            has_updates = True

                        if latitude and not location_obj.latitude:
                            location_obj.latitude = latitude
                            has_updates = True
                        if longitude and not location_obj.longitude:
                            location_obj.longitude = longitude
                            has_updates = True

                        if has_updates:
                            location_obj.save()

                    reel.location = location_obj

                transcript_text = data.get("transcript")
                summary_text = data.get("summary")
                selected_frame_timestamps = _sanitize_selected_frame_timestamps(
                    data.get("selected_frame_timestamps")
                )

                if isinstance(summary_text, str) and isinstance(transcript_text, str):
                    if summary_text.strip() == transcript_text.strip():
                        summary_text = None

                if not selected_frame_timestamps:
                    fallback_frames = list(reel.frames.order_by('timestamp').values_list('timestamp', flat=True)[:3])
                    selected_frame_timestamps = [round(float(value), 2) for value in fallback_frames]

                reel.transcript_text = transcript_text
                reel.ai_location_name = loc_name
                reel.extracted_district = district
                reel.extracted_specific_area = specific_area
                reel.ai_summary = (
                    summary_text
                    or reel.raw_caption
                    or reel.ai_summary
                )
                reel.selected_frame_timestamps = selected_frame_timestamps

                reel.extracted_general_info = general_info
                reel.extracted_known_facts = known_facts
                
                reel.is_processed = True
                reel.save()

                add_reel_to_index(reel)
                add_frames_to_index(reel)

                print(f"✅ TRANSCRIPT: {reel.transcript_text[:50]}...")
                print(f"📍 LINKED TO LOCATION: {reel.location.name if reel.location else 'None'}")

                print("🧹 Cleaning up unused media files to save space...")
                
                # 1. Delete Video and Audio files from disk and clear DB fields
                if reel.audio_file:
                    if os.path.isfile(reel.audio_file.path): 
                        os.remove(reel.audio_file.path)
                    reel.audio_file = None
                
                if reel.video_file:
                    if os.path.isfile(reel.video_file.path): 
                        os.remove(reel.video_file.path)
                    reel.video_file = None
                
                reel.save() # Save the nullified file fields
                
                # 2. Delete Unused Frames (Keep the AI-selected ones)
                # Convert the selected timestamps to a set of rounded floats for accurate matching
                selected_ts = {round(float(ts), 2) for ts in reel.selected_frame_timestamps}
                deleted_frames_count = 0
                
                for frame in reel.frames.all():
                    if round(float(frame.timestamp), 2) not in selected_ts:
                        frame.delete() # Triggers the post_delete signal we added to delete the physical .jpg
                        deleted_frames_count += 1
                        
                print(f"✨ Cleanup complete! Retained {len(selected_ts)} local frames, deleted {deleted_frames_count} unused frames, video, and audio.")
                # 👆 --- END MEDIA CLEANUP --- 👆

            except Exception as e:
                print(f"⚠️ Failed to parse Gemini JSON: {e}")

    return reel

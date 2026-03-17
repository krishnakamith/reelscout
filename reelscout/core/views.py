# views.py
import re
from django.shortcuts import render, get_object_or_404
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from .services import get_or_process_reel
from .models import ScrapedReel, Location, LocationRevision
from rest_framework import generics
from .serializers import LocationSerializer
from core.rag.rag_pipeline import run_rag


def home(request):
    return render(request, 'core/index.html')


def _parse_ranked_comment(comment_data):
    # Handle the newly formatted dictionary schema
    if isinstance(comment_data, dict):
        return {
            "text": comment_data.get("text", ""),
            "likes": comment_data.get("likes", 0),
            "age": comment_data.get("date", "Unknown"),
        }
        
    # Backwards compatibility: Handle legacy string formats
    if not isinstance(comment_data, str):
        return {"text": str(comment_data), "likes": 0, "age": "Unknown"}

    match = re.match(r'^\[SCORE:\s*(\d+)\]\s*\(([^)]+)\)\s*(.*)$', comment_data.strip())
    if not match:
        return {"text": comment_data.strip(), "likes": 0, "age": "Unknown"}

    return {
        "likes": int(match.group(1)),
        "age": match.group(2),
        "text": match.group(3).strip(),
    }


def location_detail(request, slug):
    location = get_object_or_404(Location, slug=slug)
    # The database query inherently handles date priority for rendering templates
    reels = location.reels.all().order_by('-posted_at')
    revisions = location.revisions.all().order_by('-created_at')

    community_comments = []
    for reel in reels:
        if not reel.comments_dump:
            continue
        for comment in reel.comments_dump:
            parsed = _parse_ranked_comment(comment)
            community_comments.append({
                "text": parsed["text"],
                "likes": parsed["likes"],
                "age": parsed["age"],
                "reel_short_code": reel.short_code,
                "author_handle": reel.author_handle or "unknown",
            })

    community_comments.sort(key=lambda c: c["likes"], reverse=True)

    return render(
        request,
        'core/location_detail.html',
        {
            'location': location,
            'reels': reels,
            'revisions': revisions,
            'community_comments': community_comments,
        },
    )


@api_view(['POST'])
def search_reel(request):
    url = request.data.get('url')
    raw_comments = request.data.get('comments', [])

    if not url:
        return Response({"error": "URL is required"}, status=400)

    try:
        prepared_comments = clean_and_rank_comments(raw_comments)
        reel = get_or_process_reel(url, prepared_comments=prepared_comments)

        return Response({
            "status": "success",
            "data": {
                "short_code": reel.short_code,
                "location_name": reel.location.name if reel.location else "Unknown",
                "location_slug": reel.location.slug if reel.location else None,
                "category": reel.location.category if reel.location else None,
                "comments_count": len(reel.comments_dump or []),
            }
        })

    except Exception as e:
        return Response({"error": str(e)}, status=500)


def clean_and_rank_comments(raw_list):
    if isinstance(raw_list, str):
        raw_list = raw_list.splitlines()

    if not isinstance(raw_list, list):
        raw_list = []

    cleaned_comments = []
    date_pattern = re.compile(r'^\d+[wdhm]$')
    likes_pattern = re.compile(r'^([\d,]+)\s+likes?$')

    junk_words = [
        "Reply", "See translation", "View all",
        "Hidden", "Original audio", "Comments"
    ]

    pending_date = "Unknown"

    for item in raw_list:
        if item is None:
            continue

        item = str(item).strip()

        if not item:
            continue

        if date_pattern.match(item):
            pending_date = item
            continue

        likes_match = likes_pattern.match(item)

        if likes_match:
            if cleaned_comments:
                cleaned_comments[-1]['likes'] = int(
                    likes_match.group(1).replace(',', '')
                )
            continue

        if any(j.lower() in item.lower() for j in junk_words):
            continue

        if " " not in item and len(item) < 15 and item.islower():
            continue

        cleaned_comments.append({
            'text': item,
            'likes': 0,
            'date': pending_date
        })

        pending_date = "Unknown"

    cleaned_comments.sort(key=lambda x: x['likes'], reverse=True)

    # Return as standard list of dictionaries
    return [
        {
            "text": c['text'],
            "likes": c['likes'],
            "date": c['date']
        }
        for c in cleaned_comments
    ]


def _should_show_location_cards(query):
    text = str(query or "").strip().lower()
    if not text:
        return False

    recommendation_signals = [
        "recommend",
        "suggest",
        "best places",
        "top places",
        "top 5",
        "top 10",
        "list",
        "show places",
        "show locations",
        "where should",
        "where can i go",
        "near me",
        "nearby places",
        "map",
    ]

    detail_signals = [
        "tell me about",
        "what is",
        "how to reach",
        "entry fee",
        "timings",
        "history of",
        "known facts",
        "general info",
    ]

    if any(signal in text for signal in recommendation_signals):
        return True

    if any(signal in text for signal in detail_signals):
        return False

    return False


def _sanitize_nearby_places(raw_places, limit=30):
    if not isinstance(raw_places, list):
        raise ValueError("nearby_places must be a list")

    cleaned_places = []
    for item in raw_places[:limit]:
        if not isinstance(item, dict):
            continue

        name = str(item.get("name", "")).strip()
        place_type = str(item.get("type", "")).strip() or "Place"
        distance = str(item.get("distance", "")).strip()

        if len(name) < 2:
            continue

        lat_value = item.get("lat", item.get("latitude"))
        lng_value = item.get("lng", item.get("longitude"))

        parsed_lat = None
        parsed_lng = None

        try:
            if lat_value is not None and lat_value != "":
                parsed_lat = round(float(lat_value), 6)
            if lng_value is not None and lng_value != "":
                parsed_lng = round(float(lng_value), 6)
        except (TypeError, ValueError):
            parsed_lat = None
            parsed_lng = None

        place_payload = {
            "name": name[:120],
            "type": place_type[:60],
            "distance": distance[:60],
        }

        if (
            parsed_lat is not None
            and parsed_lng is not None
            and -90 <= parsed_lat <= 90
            and -180 <= parsed_lng <= 180
        ):
            place_payload["lat"] = parsed_lat
            place_payload["lng"] = parsed_lng

        cleaned_places.append(place_payload)

    return cleaned_places


@api_view(['POST'])
@authentication_classes([])
@permission_classes([])
def save_comments_from_browser(request):

    short_code = request.data.get('short_code')
    raw_comments = request.data.get('comments', [])

    if not short_code:
        return Response({"error": "Missing short_code"}, status=400)

    try:

        reel = ScrapedReel.objects.get(short_code=short_code)
        reel.comments_dump = clean_and_rank_comments(raw_comments)
        reel.save()

        return Response({
            "status": "success",
            "count": len(reel.comments_dump),
            "location_slug": reel.location.slug if reel.location else None
        })

    except ScrapedReel.DoesNotExist:
        return Response({"error": "Reel not found"}, status=404)


class LocationListAPI(generics.ListAPIView):
    queryset = Location.objects.all()
    serializer_class = LocationSerializer


class LocationDetailAPI(generics.RetrieveAPIView):
    queryset = Location.objects.all()
    serializer_class = LocationSerializer
    lookup_field = 'slug'


@api_view(['PATCH'])
@authentication_classes([])
@permission_classes([])
def update_nearby_places(request, slug):
    location = get_object_or_404(Location, slug=slug)

    try:
        cleaned_places = _sanitize_nearby_places(request.data.get('nearby_places', []))
    except ValueError as e:
        return Response({"error": str(e)}, status=400)

    location.nearby_places = cleaned_places
    location.save(update_fields=['nearby_places', 'last_updated'])

    return Response({
        "status": "success",
        "nearby_places": location.nearby_places,
    })


@api_view(['POST'])
@authentication_classes([])
@permission_classes([])
def add_location_note(request, slug):

    location = get_object_or_404(Location, slug=slug)

    note = str(request.data.get('note', '')).strip()
    edited_by = str(request.data.get('edited_by', 'Anonymous')).strip() or "Anonymous"
    tag = str(request.data.get('tag', 'Community Tip')).strip() or "Community Tip"

    if len(note) < 5:
        return Response({"error": "Note must be at least 5 characters"}, status=400)

    edited_by = edited_by[:100]
    tag = tag[:40]

    snapshot = {
        "general_info": location.general_info or {},
        "known_facts": location.known_facts or {},
        "nearby_places": location.nearby_places or [],
    }

    revision = LocationRevision.objects.create(
        location=location,
        content_snapshot=snapshot,
        edited_by=edited_by,
        comment=f"[{tag}] {note[:220]}",
    )

    return Response({
        "status": "success",
        "revision": {
            "id": revision.id,
            "edited_by": revision.edited_by,
            "comment": revision.comment,
            "created_at": revision.created_at,
        }
    })


# -------------------------------
# CHATBOT ENDPOINT
# -------------------------------

@api_view(["POST"])
@authentication_classes([])
@permission_classes([])
def chat(request):

    query = request.data.get("message")
    history = request.data.get("history", [])

    if not query:
        return Response({"error": "Message required"}, status=400)

    result = run_rag(query, history)

    reels = result["reels"]
    recommended_locations = result["locations"]
    show_cards = _should_show_location_cards(query)

    reel_data = []

    if show_cards:
        # Only show cards for recommendation-style requests.
        for loc in recommended_locations[:5]:

            for reel in reels:

                if reel.location and reel.location.name == loc.get("name"):

                    reel_data.append({
                        "location": reel.location.name,
                        "district": reel.location.district,
                        "summary": reel.ai_summary,
                        "short_code": reel.short_code,
                        "lat": reel.location.latitude,
                        "lng": reel.location.longitude
                    })

                    break

    return Response({
        "answer": result["answer"],
        "locations": recommended_locations,
        "results": reel_data
    })
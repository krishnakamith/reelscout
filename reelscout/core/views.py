import re
from django.shortcuts import render, get_object_or_404
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from .services import get_or_process_reel
from .models import ScrapedReel, Location
from rest_framework import generics
from .serializers import LocationSerializer

def home(request):
    return render(request, 'core/index.html')

def _parse_ranked_comment(comment_text):
    if not isinstance(comment_text, str):
        return {"text": str(comment_text), "likes": 0, "age": "Unknown"}

    match = re.match(r'^\[SCORE:\s*(\d+)\]\s*\(([^)]+)\)\s*(.*)$', comment_text.strip())
    if not match:
        return {"text": comment_text.strip(), "likes": 0, "age": "Unknown"}

    return {
        "likes": int(match.group(1)),
        "age": match.group(2),
        "text": match.group(3).strip(),
    }

def location_detail(request, slug):
    location = get_object_or_404(Location, slug=slug)
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
    if not url: return Response({"error": "URL is required"}, status=400)
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
    junk_words = ["Reply", "See translation", "View all", "Hidden", "Original audio", "Comments"]
    pending_date = "Unknown"

    for item in raw_list:
        if item is None:
            continue
        item = str(item).strip()
        if not item: continue
        if date_pattern.match(item):
            pending_date = item
            continue
        likes_match = likes_pattern.match(item)
        if likes_match:
            if cleaned_comments:
                cleaned_comments[-1]['likes'] = int(likes_match.group(1).replace(',', ''))
            continue
        if any(j.lower() in item.lower() for j in junk_words): continue
        if " " not in item and len(item) < 15 and item.islower(): continue

        cleaned_comments.append({'text': item, 'likes': 0, 'date': pending_date})
        pending_date = "Unknown"

    cleaned_comments.sort(key=lambda x: x['likes'], reverse=True)
    return [f"[SCORE: {c['likes']}] ({c['date']}) {c['text']}" for c in cleaned_comments]

@api_view(['POST'])
@authentication_classes([]) 
@permission_classes([])     
def save_comments_from_browser(request):
    short_code = request.data.get('short_code')
    raw_comments = request.data.get('comments', [])
    if not short_code: return Response({"error": "Missing short_code"}, status=400)
        
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
    
    # This window serves a list of ALL locations (useful for your map page later)
class LocationListAPI(generics.ListAPIView):
    queryset = Location.objects.all()
    serializer_class = LocationSerializer

# This window serves the details of exactly ONE location (for the detail page)
class LocationDetailAPI(generics.RetrieveAPIView):
    queryset = Location.objects.all()
    serializer_class = LocationSerializer
    lookup_field = 'slug'

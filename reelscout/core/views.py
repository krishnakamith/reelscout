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

def location_detail(request, slug):
    location = get_object_or_404(Location, slug=slug)
    reels = location.reels.all().order_by('-posted_at')
    return render(request, 'core/location_detail.html', {'location': location, 'reels': reels})

@api_view(['POST'])
def search_reel(request):
    url = request.data.get('url')
    if not url: return Response({"error": "URL is required"}, status=400)
    try:
        reel = get_or_process_reel(url)
        return Response({
            "status": "success",
            "data": {
                "short_code": reel.short_code,
                "location_name": reel.location.name if reel.location else "Unknown",
            }
        })
    except Exception as e:
        return Response({"error": str(e)}, status=500)

def clean_and_rank_comments(raw_list):
    cleaned_comments = []
    date_pattern = re.compile(r'^\d+[wdhm]$')
    likes_pattern = re.compile(r'^([\d,]+)\s+likes?$')
    junk_words = ["Reply", "See translation", "View all", "Hidden", "Original audio", "Comments"]
    pending_date = "Unknown"

    for item in raw_list:
        item = item.strip()
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
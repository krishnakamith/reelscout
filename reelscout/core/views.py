from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .services import get_or_process_reel

def home(request):
    return render(request, 'core/index.html')

@api_view(['POST'])
def search_reel(request):
    url = request.data.get('url')
    if not url:
        return Response({"error": "URL is required"}, status=400)

    try:
        reel = get_or_process_reel(url)
        return Response({
            "status": "success",
            "data": {
                "short_code": reel.short_code,
                "author": reel.author_handle,
                "location_name": reel.instagram_location_name or reel.ai_location_name,
                "caption_snippet": reel.raw_caption[:200] if reel.raw_caption else "",
                "thumbnail": reel.thumbnail_url,
                "video_local_path": reel.video_file.url if reel.video_file else None
            }
        })
    except Exception as e:
        return Response({"error": str(e)}, status=500)
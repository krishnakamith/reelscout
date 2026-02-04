import re
from django.shortcuts import render
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from .services import get_or_process_reel
from .models import ScrapedReel

def home(request):
    return render(request, 'core/index.html')

@api_view(['POST'])
def search_reel(request):
    """ Step 1: Import Reel """
    url = request.data.get('url')
    if not url: return Response({"error": "URL is required"}, status=400)

    try:
        reel = get_or_process_reel(url)
        return Response({
            "status": "success",
            "data": {
                "short_code": reel.short_code,
                "author": reel.author_handle,
                "location_name": reel.instagram_location_name or reel.ai_location_name,
                "caption_snippet": reel.raw_caption[:200] if reel.raw_caption else "",
                "video_local_path": reel.video_file.url if reel.video_file else None,
            }
        })
    except Exception as e:
        return Response({"error": str(e)}, status=500)

# 👇 THE "VACUUM MODE" PARSER
def clean_and_rank_comments(raw_list):
    """
    VACUUM MODE:
    Saves ANY text that looks like a comment. 
    Attaches dates/likes if found, but never deletes text just because metadata is missing.
    """
    cleaned_comments = []
    
    # Regex patterns
    date_pattern = re.compile(r'^\d+[wdhm]$')          # Matches "26w", "4d"
    likes_pattern = re.compile(r'^([\d,]+)\s+likes?$') # Matches "183 likes"
    
    # Junk words to ignore
    junk_words = [
        "Reply", "See translation", "View all", "Hidden", "Original audio", 
        "Comments", "View replies", "Pinned", "Verified", "Follow"
    ]

    # STATE VARIABLES
    pending_date = "Unknown"

    for item in raw_list:
        item = item.strip()
        if not item: continue
        
        # 1. IS IT A DATE? (e.g., "26w")
        if date_pattern.match(item):
            pending_date = item
            continue

        # 2. IS IT A LIKE COUNT? (e.g., "183 likes")
        # If we see likes, we assume it belongs to the LAST comment we added.
        likes_match = likes_pattern.match(item)
        if likes_match:
            count = int(likes_match.group(1).replace(',', ''))
            if cleaned_comments:
                # Update the previous comment's score
                cleaned_comments[-1]['likes'] = count
            continue

        # 3. IS IT JUNK?
        # Check if the text contains any junk words
        if any(j.lower() in item.lower() for j in junk_words):
            continue
        
        # Filter out usernames (simple check: 1 word, no spaces, starts with lowercase)
        # Only strict if it's very short. Long text is almost always a comment.
        if " " not in item and len(item) < 15 and item.islower():
            continue

        # 4. IT MUST BE TEXT! SAVE IT.
        # We assume it has 0 likes for now. If the next loop finds likes, we'll update it.
        cleaned_comments.append({
            'text': item,
            'likes': 0,        # Default to 0
            'date': pending_date
        })
        
        # Reset date after using it (so we don't apply "26w" to 10 comments in a row)
        pending_date = "Unknown"

    # Sort by Likes (Highest first)
    cleaned_comments.sort(key=lambda x: x['likes'], reverse=True)

    # Format
    final_output = [
        f"[SCORE: {c['likes']}] ({c['date']}) {c['text']}" 
        for c in cleaned_comments
    ]
    
    return final_output

@api_view(['POST'])
@authentication_classes([]) 
@permission_classes([])     
def save_comments_from_browser(request):
    """ 
    Step 2: Receive Raw List -> Clean -> Save 
    """
    short_code = request.data.get('short_code')
    raw_comments = request.data.get('comments', []) # Accepts the raw messy list
    
    if not short_code:
        return Response({"error": "Missing short_code"}, status=400)
        
    try:
        reel = ScrapedReel.objects.get(short_code=short_code)
        
        # 1. Run the Cleaner
        print(f"🧹 Parsing {len(raw_comments)} raw items from browser...")
        clean_data = clean_and_rank_comments(raw_comments)
        
        # 2. Save to DB
        print(f"💾 Saving {len(clean_data)} prioritized comments to DB...")
        reel.comments_dump = clean_data 
        reel.save()
        
        return Response({
            "status": "success", 
            "count": len(clean_data)
        })
        
    except ScrapedReel.DoesNotExist:
        return Response({"error": "Reel not found. Import it first!"}, status=404)
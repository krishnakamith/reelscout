# document_builder.py
from core.models import ScrapedReel

def build_reel_document(reel: ScrapedReel):

    location_name = reel.location.name if reel.location else ""
    district = reel.location.district if reel.location else ""

    posted_date = reel.posted_at.strftime('%Y-%m-%d') if reel.posted_at else "Unknown Date"

    caption = reel.raw_caption or ""
    transcript = reel.transcript_text or ""
    summary = reel.ai_summary or ""

    formatted_comments = []
    if reel.comments_dump and isinstance(reel.comments_dump, list):
        for c in reel.comments_dump[:5]:
            if isinstance(c, dict):
                c_date = c.get('date', 'Unknown Date')
                c_text = c.get('text', '')
                formatted_comments.append(f"[{c_date}] Comment: {c_text}")
            else:
                # Handle fallback if old strings are still lingering in DB
                formatted_comments.append(f"Comment: {c}")

    comments_text = "\n".join(formatted_comments)

    general_info = ""
    known_facts = ""

    if reel.location:
        general_info = str(reel.location.general_info)
        known_facts = str(reel.location.known_facts)

    document = f"""
    Location: {location_name}
    District: {district}
    Date Posted: {posted_date}

    Summary (As of {posted_date}):
    {summary}

    Caption (As of {posted_date}):
    {caption}

    Transcript (As of {posted_date}):
    {transcript}

    Community Comments:
    {comments_text}

    General Info:
    {general_info}

    Known Facts:
    {known_facts}
    """

    return document.strip()
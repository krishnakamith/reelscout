from core.models import ScrapedReel


def build_reel_document(reel: ScrapedReel):

    location_name = reel.location.name if reel.location else ""
    district = reel.location.district if reel.location else ""

    caption = reel.raw_caption or ""
    transcript = reel.transcript_text or ""
    summary = reel.ai_summary or ""

    comments = ""
    if reel.comments_dump:
        comments = "\n".join(reel.comments_dump[:5])

    general_info = ""
    known_facts = ""

    if reel.location:
        general_info = str(reel.location.general_info)
        known_facts = str(reel.location.known_facts)

    document = f"""
    Location: {location_name}
    District: {district}

    Summary:
    {summary}

    Caption:
    {caption}

    Transcript:
    {transcript}

    Community Comments:
    {comments}

    General Info:
    {general_info}

    Known Facts:
    {known_facts}
    """

    return document.strip()
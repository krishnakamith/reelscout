from .retriever import search
from core.models import ScrapedReel
from core.gemini_service import GeminiService


def run_rag(query):

    results = search(query)

    reels = []

    for r in results:
        try:
            reel = ScrapedReel.objects.get(id=r["reel_id"])
            reels.append(reel)
        except ScrapedReel.DoesNotExist:
            continue

    context_parts = []

    for reel in reels:

        location_name = reel.location.name if reel.location else ""
        district = reel.location.district if reel.location else ""

        context = f"""
        Location: {location_name}
        District: {district}

        Summary:
        {reel.ai_summary}

        Caption:
        {reel.raw_caption}

        Transcript:
        {reel.transcript_text}
        """

        context_parts.append(context)

    full_context = "\n\n".join(context_parts)

    prompt = f"""
    You are a travel discovery assistant for ReelScout.

    Use the following context extracted from Instagram reels to answer the user question.

    Context:
    {full_context}

    User Question:
    {query}

    Answer in a helpful way and recommend the relevant locations.
    """

    gemini = GeminiService()

    response = gemini.model.generate_content(prompt)

    answer = response.text

    return {
        "answer": answer,
        "reels": reels
    }
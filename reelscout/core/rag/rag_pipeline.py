import json

from .retriever import hybrid_search
from core.gemini_service import GeminiService


def run_rag(query, history=None):

    # Ensure history exists
    if history is None:
        history = []

    # Convert conversation history into text
    conversation_context = "\n".join(history)

    # Retrieve relevant reels using hybrid search
    reels = hybrid_search(query)
    if not reels:
        return {
            "answer": "I couldn't find any relevant locations in the current ReelScout database for that question.",
            "locations": [],
            "reels": []
        }

    if len(reels) < 2:
        return {
            "answer": "I currently have very limited reel data. Try adding more reels or ask about a specific location already discovered.",
            "locations": [],
            "reels": []
        }

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
    You are ReelScout, an AI travel discovery assistant for Kerala.

    You MUST answer ONLY using the provided context from the ReelScout database.

    STRICT RULES:
    - If the answer cannot be found in the context, respond with:
    "I couldn't find this in the ReelScout database yet."
    - DO NOT use any outside knowledge.
    - DO NOT invent locations.
    - DO NOT create travel plans unless the locations appear in the context.
    - ONLY recommend locations that appear in the context.

    Conversation history:
    {conversation_context}

    Context:
    {full_context}

    Return your response in STRICT VALID JSON ONLY.

    Format:

    {{
    "answer": "text answer for user",
    "recommended_locations": [
    {{
        "name": "location name",
        "district": "district name",
        "reason": "why it is relevant"
    }}
    ]
    }}
    """

    gemini = GeminiService()

    response = gemini.model.generate_content(prompt)

    text = response.text.strip()

    if text.startswith("```"):
        text = text.replace("```json", "").replace("```", "").strip()

    # Try parsing Gemini JSON
    try:
        data = json.loads(text)

    except Exception:

        data = {
            "answer": text,
            "recommended_locations": []
        }

    return {
        "answer": data.get("answer", ""),
        "locations": data.get("recommended_locations", []),
        "reels": reels
    }
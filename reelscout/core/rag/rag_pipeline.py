# rag_pipeline.py
import json

from .retriever import hybrid_search
from core.gemini_service import GeminiService
from core.models import Location


def _to_kv_lines(payload):
    if not isinstance(payload, dict) or not payload:
        return "None"
    lines = []
    for key, value in payload.items():
        key_text = str(key).strip()
        value_text = str(value).strip()
        if not key_text or not value_text:
            continue
        lines.append(f"- {key_text}: {value_text}")
    return "\n".join(lines) if lines else "None"


def _format_nearby_places(nearby_places):
    if not isinstance(nearby_places, list) or not nearby_places:
        return "None"
    parts = []
    for place in nearby_places[:8]:
        if not isinstance(place, dict):
            continue
        name = str(place.get("name", "")).strip()
        place_type = str(place.get("type", "")).strip()
        distance = str(place.get("distance", "")).strip()
        if not name:
            continue
        label = name
        if place_type:
            label += f" ({place_type})"
        if distance:
            label += f" - {distance}"
        parts.append(label)
    return ", ".join(parts) if parts else "None"


def _tokenize(text):
    cleaned = "".join(ch.lower() if ch.isalnum() else " " for ch in str(text or ""))
    return [token for token in cleaned.split() if len(token) >= 3]


def _location_match_score(location, query_text, query_tokens):
    score = 0

    fields = [
        location.name,
        location.district,
        location.specific_area,
        location.category,
    ]

    aliases = location.alternate_names if isinstance(location.alternate_names, list) else []
    fields.extend(aliases[:10])

    searchable_blob = " ".join(
        [
            str(location.general_info or {}),
            str(location.known_facts or {}),
            str(location.nearby_places or []),
        ]
    ).lower()

    for field in fields:
        value = str(field or "").strip().lower()
        if not value:
            continue
        if value in query_text:
            score += 8
        elif any(token in value for token in query_tokens):
            score += 2

    for token in query_tokens:
        if token in searchable_blob:
            score += 1

    return score


def _select_relevant_locations(query, reels, limit=8):
    query_text = str(query or "").strip().lower()
    query_tokens = _tokenize(query_text)

    scored = []
    for location in Location.objects.all():
        score = _location_match_score(location, query_text, query_tokens)
        if score > 0:
            scored.append((score, location))

    scored.sort(key=lambda item: item[0], reverse=True)
    ranked = [location for _, location in scored[:limit]]

    # Ensure locations present in retrieved reels are included.
    for reel in reels:
        if reel.location and reel.location not in ranked:
            ranked.append(reel.location)
            if len(ranked) >= limit:
                break

    return ranked[:limit]


def _build_location_context(locations):
    parts = []
    for location in locations:
        if isinstance(location.alternate_names, list) and location.alternate_names:
            alias_text = ", ".join(str(alias).strip() for alias in location.alternate_names[:8] if str(alias).strip())
            if not alias_text:
                alias_text = "None"
        else:
            alias_text = "None"
        block = f"""
Location: {location.name}
District: {location.district or ""}
Specific Area: {location.specific_area or ""}
Category: {location.category or ""}
Coordinates: {location.latitude or ""}, {location.longitude or ""}
Alternate Names: {alias_text}
General Info:
{_to_kv_lines(location.general_info)}
Known Facts:
{_to_kv_lines(location.known_facts)}
Nearby Places: {_format_nearby_places(location.nearby_places)}
"""
        parts.append(block.strip())

    return "\n\n".join(parts)


def _build_reel_context(reels):
    parts = []
    for reel in reels:
        location_name = reel.location.name if reel.location else ""
        district = reel.location.district if reel.location else ""
        posted_date = reel.posted_at.strftime('%Y-%m-%d') if reel.posted_at else "Unknown Date"
        context = f"""
Location: {location_name}
District: {district}
Date Posted: {posted_date}
Summary (As of {posted_date}):
{reel.ai_summary or ""}
Caption (As of {posted_date}):
{reel.raw_caption or ""}
Transcript (As of {posted_date}):
{reel.transcript_text or ""}
"""
        parts.append(context.strip())
    return "\n\n".join(parts)


import google.generativeai as genai

def _safe_generate(gemini, prompt):
    if not hasattr(gemini, "model"):
        return None
    try:
        # Force strict, factual answers by lowering temperature and top_p
        response = gemini.model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.1, 
                top_p=0.8,
                top_k=40
            )
        )
        return response.text.strip() if response and response.text else None
    except Exception as e:
        print(f"Chatbot generation error: {e}") 
        return None


def _clean_json_block(text):
    value = str(text or "").strip()
    if value.startswith("```"):
        value = value.replace("```json", "").replace("```", "").strip()
    return value


def _resolve_location_name(name, locations):
    needle = str(name or "").strip().lower()
    if not needle:
        return None
    for location in locations:
        if location.name.lower() == needle:
            return location
        aliases = location.alternate_names if isinstance(location.alternate_names, list) else []
        if any(str(alias).strip().lower() == needle for alias in aliases):
            return location
    return None


def _infer_answer_style(query):
    text = str(query or "").strip().lower()
    if not text:
        return "specific"

    list_signals = [
        "recommend",
        "suggest",
        "best places",
        "top places",
        "top 5",
        "top 10",
        "list",
        "show places",
        "show locations",
        "nearby",
        "map",
    ]
    detailed_signals = [
        "all details",
        "full details",
        "everything about",
        "complete guide",
        "full info",
        "detailed",
        "in detail",
    ]

    if any(signal in text for signal in detailed_signals):
        return "detailed"
    if any(signal in text for signal in list_signals):
        return "list"
    return "specific"


def _limit_specific_answer(answer):
    text = str(answer or "").strip()
    if not text:
        return text

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if len(lines) > 1 and any(line.startswith(("-", "*", "1.", "2.", "3.")) for line in lines):
        concise_lines = []
        for line in lines:
            if line.startswith(("-", "*", "1.", "2.", "3.")):
                concise_lines.append(line)
            if len(concise_lines) >= 2:
                break
        if concise_lines:
            return " ".join(concise_lines)

    sentence_candidates = [segment.strip() for segment in text.replace("\n", " ").split(".") if segment.strip()]
    if not sentence_candidates:
        return text
    return ". ".join(sentence_candidates[:2]) + "."


def run_rag(query, history=None):

    # Ensure history exists
    if history is None:
        history = []

    # Convert conversation history into text
    conversation_context = "\n".join(history)

    # Retrieve relevant reels and related locations
    try:
        reels = hybrid_search(query)
    except Exception:
        reels = []
    relevant_locations = _select_relevant_locations(query, reels)

    # Add one representative reel per relevant location when semantic retrieval misses it.
    context_reels = list(reels)
    seen_reel_ids = {reel.id for reel in context_reels}
    for location in relevant_locations:
        candidate = location.reels.order_by("-posted_at", "-created_at").first()
        if candidate and candidate.id not in seen_reel_ids:
            context_reels.append(candidate)
            seen_reel_ids.add(candidate.id)
        if len(context_reels) >= 8:
            break

    # NEW: Sort the final context reels strictly by date (newest first)
    # This prioritizes latest data when building the context payload for LLM
    context_reels.sort(
        key=lambda x: x.posted_at.timestamp() if x.posted_at else 0, 
        reverse=True
    )

    reel_context = _build_reel_context(context_reels[:3])
    location_context = _build_location_context(relevant_locations[:3])
    answer_style = _infer_answer_style(query)

    prompt = f"""
    You are ReelScout, an expert, native travel guide for Kerala, India. You speak in a helpful, highly specific, and engaging tone.

    CRITICAL RULES:
    1. NEVER sound like a robot. Do not use phrases like "Based on the database," "According to the context," or "As an AI." State the facts naturally as if you personally know the place.
    2. Answer ONLY what the user asked. If they ask for the entry fee, just give the fee. Do not dump the entire history or general info of the location unless asked.
    3. NO HALLUCINATIONS. Base your answers strictly on the ReelScout Data Context below. Do not invent details, trails, or facts.
    4. GENERAL KNOWLEDGE FALLBACK: If the answer is completely absent from the ReelScout context, you may use concise general travel knowledge, but you MUST briefly indicate this (e.g., "I don't have recent Reel data on that, but generally...").

    TIME & CONFLICT RESOLUTION:
    - If different reels or comments give conflicting information (e.g., different entry fees or water levels), ALWAYS trust the data with the newest 'Date Posted'.
    - If a condition is dynamic (weather, water levels, crowds), explicitly mention the recency (e.g., "As of March 2024, the water level was...").

    ANSWER STYLE DIRECTIVES ({answer_style} mode):
    - "specific": Maximum 2 short sentences. Give only the exact requested point.
    - "list": Provide a concise, bulleted-style response with only the most relevant items.
    - "detailed": Provide a fuller, comprehensive response, but stay strictly on the user's topic.

    Conversation History:
    {conversation_context}

    ReelScout Data Context:
    [LOCATIONS]
    {location_context or "No location context available."}

    [REELS]
    {reel_context or "No reel context available."}

    Return your response in STRICT VALID JSON ONLY. Do not wrap it in markdown code blocks.

    Format:
    {{
      "answer": "Your conversational, highly specific text answer goes here.",
      "recommended_locations": [
        {{
            "name": "Location Name",
            "district": "District Name",
            "reason": "Exactly why this fits the user's prompt based on the context."
        }}
      ]
    }}
    """

    gemini = GeminiService()
    text = _safe_generate(gemini, prompt)

    if not text:
        if relevant_locations:
            top = relevant_locations[:3]
            if answer_style == "specific":
                fallback_answer = f"I found matching ReelScout data for {top[0].name}."
            else:
                fallback_answer = "I found location data in ReelScout. Here are the best matches: " + ", ".join(
                    [f"{loc.name} ({loc.district or 'District unknown'})" for loc in top]
                )
            return {
                "answer": fallback_answer,
                "locations": [
                    {
                        "name": loc.name,
                        "district": loc.district or "",
                        "reason": "Matched from ReelScout location data"
                    }
                    for loc in top
                ],
                "reels": context_reels[:8]
            }
        return {
            "answer": "I couldn't fetch enough data right now. Please try again.",
            "locations": [],
            "reels": []
        }

    text = _clean_json_block(text)

    # Try parsing Gemini JSON
    try:
        data = json.loads(text)

    except Exception:

        data = {
            "answer": text,
            "recommended_locations": []
        }

    model_recommendations = data.get("recommended_locations", [])
    normalized_recommendations = []
    for item in model_recommendations:
        if not isinstance(item, dict):
            continue
        loc_name = str(item.get("name", "")).strip()
        resolved = _resolve_location_name(loc_name, relevant_locations)
        if resolved:
            normalized_recommendations.append({
                "name": resolved.name,
                "district": resolved.district or "",
                "reason": str(item.get("reason", "Relevant to your query")).strip() or "Relevant to your query",
            })
        elif loc_name:
            normalized_recommendations.append({
                "name": loc_name,
                "district": str(item.get("district", "")).strip(),
                "reason": str(item.get("reason", "General knowledge suggestion")).strip() or "General knowledge suggestion",
            })

    if not normalized_recommendations and relevant_locations:
        normalized_recommendations = [
            {
                "name": loc.name,
                "district": loc.district or "",
                "reason": "Matched from ReelScout location data"
            }
            for loc in relevant_locations[:5]
        ]

    answer_text = data.get("answer", "")
    if answer_style == "specific":
        answer_text = _limit_specific_answer(answer_text)

    return {
        "answer": answer_text,
        "locations": normalized_recommendations[:5],
        "reels": context_reels[:8]
    }
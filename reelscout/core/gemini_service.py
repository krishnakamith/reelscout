import os
import time
import json
import re
import google.generativeai as genai
from django.conf import settings
from PIL import Image

class GeminiService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("⚠️ GEMINI_API_KEY not found in .env")
            return

        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-3-flash-preview')

    def _extract_comment_text(self, raw_comment):
        if isinstance(raw_comment, dict):
            text = str(raw_comment.get("text", "")).strip()
        else:
            text = str(raw_comment or "").strip()
        if text.lower() == "[object object]":
            return ""

        # Remove ranking metadata like: [SCORE: 12] (2d)
        text = re.sub(r'^\[SCORE:\s*\d+\]\s*\([^)]+\)\s*', "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s+", " ", text).strip()
        return text

    def _build_comments_context(self, comments_dump, limit=15):
        if not isinstance(comments_dump, list) or not comments_dump:
            return "No comments available."

        cleaned = []
        for comment in comments_dump[:limit]:
            text = self._extract_comment_text(comment)
            if text:
                cleaned.append(f"- {text}")

        return "\n".join(cleaned) if cleaned else "No comments available."

    def upload_audio(self, audio_path):
        print(f"🔍 Looking for audio at: {audio_path}")

        if not os.path.exists(audio_path):
            print(f"❌ ERROR: File does not exist!")
            return None

        print("☁️  Uploading audio to Gemini...")
        try:
            audio_file = genai.upload_file(path=audio_path)

            while audio_file.state.name == "PROCESSING":
                print(".", end="", flush=True) # Print dots while waiting
                time.sleep(1)
                audio_file = genai.get_file(audio_file.name)

            print("\n✅ Audio processed and ready.")
            return audio_file
        except Exception as e:
            print(f"❌ Upload Failed: {e}")
            return None

    def verify_location_merge(self, new_name, new_category, new_info, existing_location, distance):
        """Asks Gemini to confirm if two nearby locations are actually the same place."""
        print(f"🕵️ AI VERIFICATION: Checking if '{new_name}' is the same as '{existing_location.name}'...")
        
        prompt = f"""
        You are an expert geographical AI data deduplication agent. 
        We found two locations very close to each other ({distance:.1f} meters apart). 
        Determine if they are the EXACT SAME point of interest.

        LOCATION 1 (Newly extracted data):
        - Name: {new_name}
        - Category: {new_category}
        - Extracted Details: {new_info}

        LOCATION 2 (Existing database entry):
        - Name: {existing_location.name}
        - Category: {existing_location.category}
        - Known Alternate Names: {existing_location.alternate_names}
        - Existing Details: {existing_location.general_info}

        RULES:
        - If they describe the exact same place (even if one is a nickname or misspelling), return EXACTLY the word "YES".
        - If they are distinct, separate places (e.g., a specific cafe near a beach, or two different waterfalls on the same trail), return EXACTLY the word "NO".
        
        Respond with ONLY "YES" or "NO".
        """
        
        try:
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(temperature=0.1)
            )
            answer = response.text.strip().upper()
            
            if "YES" in answer:
                return True
            return False
            
        except Exception as e:
            print(f"⚠️ Merge Verification Error: {e}")
            return False

    def analyze_reel(self, reel, audio_path=None):
        print(f"🧠 Gemini is analyzing {reel.short_code}...")

        # 1. Images
        all_frames = list(reel.frames.all())
        step = len(all_frames) // 6 if len(all_frames) > 6 else 1
        selected_frames = all_frames[::step][:6]
        selected_frame_timestamps = [round(float(frame.timestamp), 2) for frame in selected_frames]

        image_objects = []
        for frame in selected_frames:
            if os.path.exists(frame.image.path):
                image_objects.append(Image.open(frame.image.path))

        # 2. Audio
        gemini_audio = None
        if audio_path:
            gemini_audio = self.upload_audio(audio_path)
        else:
            print("⚠️ No audio path provided to GeminiService.")

        # 3. Process Comments
        comments_text = self._build_comments_context(reel.comments_dump)

        prompt = f"""
        You are a highly intelligent Malayalam travel data extraction expert.

        INPUTS:
        - Audio: Listen for spoken Malayalam words. Ignore music.
        - Caption: "{reel.raw_caption}"
        - Comments from viewers: "{comments_text}"
        - Candidate frame timestamps (seconds): {selected_frame_timestamps}

        TASK A: Transcribe the spoken Malayalam exactly. If NO speech, write "Music only".
        
        TASK B: Identify the location and provide its geographic latitude and longitude coordinates.
        LOCATION EVIDENCE PRIORITY (STRICT):
        1) Caption text + spoken audio transcript from this reel.
        2) Visual frames.
        3) Comments only as secondary support when (1) and (2) are ambiguous.
        If comments conflict with a clear caption/transcript mention, trust caption/transcript.
        
        TASK B1: ALIAS DETECTION. Deeply analyze the caption, audio, and comments. Look for locals correcting the creator, common misspellings, alternative regional names, or broader area names for this exact spot. Return them as a list of strings in "alternate_names".

        TASK B2: Create a short travel summary (2-3 sentences) in English for UI display.
        The summary must NOT be a verbatim transcript. It should synthesize audio + caption + comments + visuals.
        
        TASK B3: Determine "category" for the location.
        - If a category is directly mentioned (for example: beach, waterfall, temple), use that.
        - If not directly mentioned, infer the most likely category from visuals + transcript + caption + comments.
        - Choose ONLY one category string.
        - Use one of these normalized categories where possible:
          "Waterfall", "Beach", "Temple", "Church", "Mosque", "Fort", "Dam", "Lake", "Hill Station",
          "Viewpoint", "Cave", "Forest", "River", "Park", "Island", "Palace", "Museum", "Town", "Village", "Other".
        - If evidence is weak, return "Other".

        TASK C: Smart Dynamic Data Collection.
        Extract data into two strict JSON dictionaries based ONLY on what is actively mentioned. 
        Every output string in JSON must be in English.
        
        Section 1 - "general_info": Collect subjective highlights and vibes.
        Use standard keys if possible: "monsoon_vibe", "scenic_highlights", "crowd_energy". DO NOT write paragraphs.

        Section 2 - "known_facts": Extract ONLY verifiable, strict objective facts.
        CRITICAL: You MUST categorize facts using these standard keys whenever possible:
        "entry_fee", "timings", "trek_distance", "parking", "best_time", "accessibility", "food", "transit".
        Only invent a short snake_case key if the fact doesn't fit the standards above.
        Keep the value extremely concise (e.g. "2 km", "₹50", "6 AM - 6 PM").

        IMPORTANT COMMENT HANDLING:
        - Do NOT copy or paste any comment verbatim into output fields.
        - Derive the travel information from comments and rewrite it as concise English.
        - Put subjective/experience signals into "general_info" and verifiable details into "known_facts".
        - Ignore spam, emoji-only, jokes, user tags, and irrelevant chatter.
        
        CRITICAL: If a detail is not mentioned in the audio, caption, or comments, DO NOT invent a key for it. 

        TASK D: Pick only the most relevant key visual moments for gallery display.
        Choose 2 to 4 timestamps from the provided candidate frame timestamps list only.
        Return them in "selected_frame_timestamps" as numbers.

        Format strictly as JSON:
        {{
            "transcript": "Your transcript here...",
            "summary": "2-3 sentence travel-focused summary, not transcript",
            "location": "Place Name",
            "alternate_names": ["local_nickname", "misspelling_1"],
            "category": "One best category",
            "district": "District Name",
            "specific_area": "Specific area / locality",
            "latitude": 10.8505,
            "longitude": 76.2711,
            "general_info": {{
                "your_dynamic_key_here": "short extracted text"
            }},
            "known_facts": {{
                "your_factual_key_here": "short fact"
            }},
            "selected_frame_timestamps": [2.0, 8.0, 14.0]
        }}
        """

        content = [prompt]
        if gemini_audio: content.append(gemini_audio)
        content.extend(image_objects)

        try:
            response = self.model.generate_content(content)
            raw_text = response.text

            print(f"\n📝 RAW GEMINI RESPONSE:\n{raw_text}\n")

            clean_text = raw_text.replace("```json", "").replace("```", "").strip()
            return clean_text

        except Exception as e:
            print(f"⚠️ Gemini Error: {e}")
            return None

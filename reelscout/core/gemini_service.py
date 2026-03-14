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
        # Updated to the model available in your list
        self.model = genai.GenerativeModel('gemini-3-flash-preview')

    def _extract_comment_text(self, raw_comment):
        if isinstance(raw_comment, dict):
            text = str(raw_comment.get("text", "")).strip()
        else:
            text = str(raw_comment or "").strip()

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
        # DEBUG: Print exactly where we are looking
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
        Extract data into two strict JSON dictionaries based ONLY on what is actively mentioned in the inputs. DO NOT use predefined keys. Invent your own highly descriptive, short snake_case keys based on the context of the video. 
        Every output string in JSON must be in English.
        
        Section 1 - "general_info": Collect the subjective highlights, atmospheric descriptions, and opinions. 
        (Examples of keys you MIGHT invent if mentioned: "monsoon_vibe", "scenic_highlights", "creator_opinion", "local_myth", "crowd_energy"). DO NOT write paragraphs.

        Section 2 - "known_facts": Extract ONLY verifiable, strict objective facts.
        (Examples of keys you MIGHT invent if mentioned: "jeep_safari_cost", "nearest_railway", "leech_warning", "exact_opening_time", "two_wheeler_parking", "trek_difficulty").

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
            "category": "One best category",
            "district": "District Name",
            "specific_area": "Specific area / locality",
            "latitude": 10.8505,
            "longitude": 76.2711,
            "general_info": {{
                "your_dynamic_key_here": "short extracted text",
                "another_dynamic_key": "short extracted text"
            }},
            "known_facts": {{
                "your_factual_key_here": "short fact",
                "another_factual_key": "short fact"
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

            # 👇 THIS IS THE KEY DEBUG LINE 👇
            print(f"\n📝 RAW GEMINI RESPONSE:\n{raw_text}\n")

            clean_text = raw_text.replace("```json", "").replace("```", "").strip()
            return clean_text

        except Exception as e:
            print(f"⚠️ Gemini Error: {e}")
            return None

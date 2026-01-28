import os
import time
import json
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
        self.model = genai.GenerativeModel('gemini-2.5-flash')

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

        # 3. Prompt
        prompt = f"""
        You are a Malayalam language expert.
        
        INPUTS:
        - Audio: Listen for spoken Malayalam words. Ignore music.
        - Caption: "{reel.raw_caption}"
        
        TASK 1: Transcribe the spoken Malayalam exactly. 
                If there is NO speech (only music), write "Music only".
        
        TASK 2: Identify the location.

        Format strictly as JSON:
        {{
            "transcript": "Your transcript here...",
            "location": "Place Name",
            "district": "District Name",
            "summary": "Reasoning..."
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
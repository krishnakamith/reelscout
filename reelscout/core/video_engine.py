import cv2
import os
import whisper
from moviepy.editor import VideoFileClip
from django.conf import settings

class VideoEngine:
    def __init__(self, video_path, reel_id):
        self.video_path = video_path
        self.reel_id = reel_id
        
        # 1. PATHS: Store in 'reel/frames' and 'reel/audio'
        # (It uses your MEDIA_ROOT setting automatically)
        self.frames_dir = os.path.join(settings.MEDIA_ROOT, 'frames')
        self.audio_dir = os.path.join(settings.MEDIA_ROOT, 'audio')
        
        # Create folders if they don't exist
        os.makedirs(self.frames_dir, exist_ok=True)
        os.makedirs(self.audio_dir, exist_ok=True)

    def extract_frames(self, interval=2):
        """
        Extracts frames and calculates their timestamp.
        Returns: List of dicts [{'path': '...', 'time': 2.0}, ...]
        """
        print(f"📸 Extracting frames for {self.reel_id}...")
        
        cap = cv2.VideoCapture(self.video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps <= 0: fps = 30 # Safety fallback
        
        frame_interval = int(fps * interval)
        
        count = 0
        saved_count = 0
        frame_data = []

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret: break

            if count % frame_interval == 0:
                # 1. Calculate Timestamp
                current_time = round(count / fps, 2)
                
                # 2. Generate Unique Filename
                frame_name = f"{self.reel_id}_frame_{saved_count}.jpg"
                save_path = os.path.join(self.frames_dir, frame_name)
                
                # 3. Save Image
                cv2.imwrite(save_path, frame)
                
                # 4. Store Data
                rel_path = os.path.join('frames', frame_name).replace("\\", "/")
                frame_data.append({
                    "path": rel_path,
                    "time": current_time
                })
                saved_count += 1
            
            count += 1

        cap.release()
        print(f"✅ Extracted {saved_count} frames.")
        return frame_data

    def extract_and_transcribe_audio(self):
        """
        Extracts audio and runs Whisper in STRICT Malayalam mode.
        """
        print(f"🎤 Extracting & Transcribing {self.reel_id}...")
        
        audio_filename = f"{self.reel_id}.mp3"
        save_path = os.path.join(self.audio_dir, audio_filename)
        
        try:
            # 1. Extract Audio File
            video = VideoFileClip(self.video_path)
            video.audio.write_audiofile(save_path, verbose=False, logger=None)
            video.close() # Release file lock
            
            # 2. Run Whisper (Strict Configuration)
            print("🤖 Loading Whisper Model (small)...")
            model = whisper.load_model("small") 
            
            print("📝 Transcribing (Strict Mode)...")
            result = model.transcribe(
                save_path, 
                language="ml",
                fp16=False,                   # Fixes Windows CPU errors
                temperature=0,                # 0 = No creative guessing
                condition_on_previous_text=False,
                initial_prompt="ഇതൊരു മലയാളം യാത്രാ വീഡിയോ ആണ്. സ്ഥലം എവിടെ എന്ന് പറയൂ." # Hint
            ) 
            
            text = result["text"].strip()
            print(f"✅ Transcript found: \"{text[:50]}...\"")
            
            rel_path = os.path.join('audio', audio_filename).replace("\\", "/")
            return rel_path, text
            
        except Exception as e:
            print(f"⚠️ Audio/Whisper Error: {e}")
            return None, ""
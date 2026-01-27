import cv2
import os
import whisper
from moviepy.editor import VideoFileClip
from django.conf import settings

class VideoEngine:
    def __init__(self, video_path, reel_id):
        self.video_path = video_path
        self.reel_id = reel_id
        
        # Define paths
        self.frames_dir = os.path.join(settings.MEDIA_ROOT, 'frames', reel_id)
        self.audio_dir = os.path.join(settings.MEDIA_ROOT, 'audio')
        
        # Create folders if they don't exist
        os.makedirs(self.frames_dir, exist_ok=True)
        os.makedirs(self.audio_dir, exist_ok=True)

    def extract_frames(self, interval=2):
        """
        Saves 1 frame every 'interval' seconds.
        Returns: List of relative paths for the database/AI.
        """
        print(f"📸 Extracting frames for {self.reel_id}...")
        
        cap = cv2.VideoCapture(self.video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_interval = int(fps * interval)
        
        count = 0
        saved_count = 0
        frame_paths = []

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            if count % frame_interval == 0:
                frame_name = f"frame_{saved_count}.jpg"
                save_path = os.path.join(self.frames_dir, frame_name)
                
                # Save high-quality JPG
                cv2.imwrite(save_path, frame)
                
                # Store relative path (e.g. 'reels/frames/xyz/frame_0.jpg')
                rel_path = os.path.join('frames', self.reel_id, frame_name).replace("\\", "/")
                frame_paths.append(rel_path)
                saved_count += 1
            
            count += 1

        cap.release()
        print(f"✅ Extracted {saved_count} frames.")
        return frame_paths

    def extract_and_transcribe_audio(self):
        """
        Extracts audio and runs Whisper specifically tuned for Malayalam.
        """
        print(f"🎤 Extracting & Transcribing {self.reel_id}...")
        
        audio_filename = f"{self.reel_id}.mp3"
        save_path = os.path.join(self.audio_dir, audio_filename)
        
        try:
            # 1. Extract Audio
            video = VideoFileClip(self.video_path)
            video.audio.write_audiofile(save_path, verbose=False, logger=None)
            
            # 2. Run Whisper (Malayalam Tuned)
            # Switch to "small" for better Malayalam accuracy (it is slightly slower but worth it)
            print("🤖 Loading Whisper Model (small)...")
            model = whisper.load_model("small") 
            
            print("📝 Transcribing (Malayalam)...")
            # Force language="ml" so it knows what to listen for
            result = model.transcribe(save_path, language="ml") 
            text = result["text"].strip()
            
            print(f"✅ Transcript found: \"{text[:50]}...\"")
            
            rel_path = os.path.join('audio', audio_filename).replace("\\", "/")
            return rel_path, text
            
        except Exception as e:
            print(f"⚠️ Audio/Whisper Error: {e}")
            return None, ""

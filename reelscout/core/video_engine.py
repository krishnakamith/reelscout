import cv2
import os
import warnings
from moviepy.editor import VideoFileClip
from django.conf import settings

# Suppress warnings
warnings.filterwarnings("ignore")

class VideoEngine:
    def __init__(self, video_path, reel_id):
        self.video_path = video_path
        self.reel_id = reel_id
        
        self.frames_dir = os.path.join(settings.MEDIA_ROOT, 'frames')
        self.audio_dir = os.path.join(settings.MEDIA_ROOT, 'audio')
        
        os.makedirs(self.frames_dir, exist_ok=True)
        os.makedirs(self.audio_dir, exist_ok=True)

    def extract_frames(self, interval=2):
        print(f"📸 Extracting frames for {self.reel_id}...")
        cap = cv2.VideoCapture(self.video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps <= 0: fps = 30
        
        frame_interval = int(fps * interval)
        count = 0
        saved_count = 0
        frame_data = []

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret: break

            if count % frame_interval == 0:
                current_time = round(count / fps, 2)
                frame_name = f"{self.reel_id}_frame_{saved_count}.jpg"
                save_path = os.path.join(self.frames_dir, frame_name)
                
                cv2.imwrite(save_path, frame)
                
                rel_path = os.path.join('frames', frame_name).replace("\\", "/")
                frame_data.append({"path": rel_path, "time": current_time})
                saved_count += 1
            count += 1

        cap.release()
        print(f"✅ Extracted {saved_count} frames.")
        return frame_data

    def extract_audio_only(self):
        """Extracts MP3 for Gemini."""
        print(f"🎤 Extracting Audio File for {self.reel_id}...")
        audio_filename = f"{self.reel_id}.mp3"
        save_path = os.path.join(self.audio_dir, audio_filename)
        
        try:
            video = VideoFileClip(self.video_path)
            video.audio.write_audiofile(save_path, verbose=False, logger=None)
            video.close()
            
            rel_path = os.path.join('audio', audio_filename).replace("\\", "/")
            return rel_path
            
        except Exception as e:
            print(f"⚠️ Audio Extraction Error: {e}")
            return None
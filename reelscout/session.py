import instaloader
import os
from dotenv import load_dotenv

# 1. Load environment variables
load_dotenv()

USER = os.getenv("INSTAGRAM_USER")
PASS = os.getenv("INSTAGRAM_PASSWORD")

if not USER or not PASS:
    print("❌ Error: INSTAGRAM_USER or INSTAGRAM_PASSWORD not found in .env")
    exit()

print(f"🔐 Logging in as {USER}...")

# 2. Login to Instagram
L = instaloader.Instaloader()

try:
    L.login(USER, PASS)
    print("✅ Login Successful!")
    
    # 3. Save the session file
    # This creates a file named "session-yourusername" in the same folder
    filename = f"session-{USER}"
    L.save_session_to_file(filename=filename)
    
    print(f"💾 Session saved to: {filename}")
    print("👉 You can now run your Django server.")
    
except Exception as e:
    print(f"❌ Login Failed: {e}")
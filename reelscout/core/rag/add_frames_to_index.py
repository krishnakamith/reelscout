import faiss
import pickle
import numpy as np

from core.models import ReelFrame
from .image_embedder import embed_image


FRAME_INDEX_PATH = "frame_index.faiss"
FRAME_META_PATH = "frame_metadata.pkl"


def add_frames_to_index(reel):

    frames = ReelFrame.objects.filter(reel=reel)

    if not frames.exists():
        print("⚠ No frames found for reel")
        return

    try:
        index = faiss.read_index(FRAME_INDEX_PATH)

        with open(FRAME_META_PATH, "rb") as f:
            metadata = pickle.load(f)

    except Exception:
        print("⚠ Frame index not found. Build it first.")
        return

    vectors = []

    for frame in frames:

        path = frame.image.path

        vec = embed_image(path)

        vectors.append(vec)

        metadata.append({
            "reel_id": reel.id,
            "frame_id": frame.id
        })

    vectors = np.array(vectors).astype("float32")

    index.add(vectors)

    faiss.write_index(index, FRAME_INDEX_PATH)

    with open(FRAME_META_PATH, "wb") as f:
        pickle.dump(metadata, f)

    print(f"🎞 Frames for reel {reel.short_code} added to frame index")
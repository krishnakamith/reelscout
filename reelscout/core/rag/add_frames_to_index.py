import os
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

    vectors = []

    for frame in frames:

        path = frame.image.path

        vec = embed_image(path)

        vectors.append(vec)

    vectors = np.array(vectors).astype("float32")

    # Check if the frame index exists before trying to read it
    if not os.path.exists(FRAME_INDEX_PATH):
        print(f"⚠️ {FRAME_INDEX_PATH} not found. Creating a new frame index...")
        dimension = vectors.shape[1]
        index = faiss.IndexFlatL2(dimension)
        metadata = []
    else:
        index = faiss.read_index(FRAME_INDEX_PATH)
        with open(FRAME_META_PATH, "rb") as f:
            metadata = pickle.load(f)

    index.add(vectors)

    faiss.write_index(index, FRAME_INDEX_PATH)

    # Add metadata for every frame we just processed
    for frame in frames:
        metadata.append({
            "reel_id": reel.id,
            "frame_id": frame.id
        })

    with open(FRAME_META_PATH, "wb") as f:
        pickle.dump(metadata, f)

    print(f"🎞 Frames for reel {reel.short_code} added to frame index")
import faiss
import pickle
import numpy as np

from core.models import ScrapedReel
from .embedder import embed_text


def search_frames(query, k=5):
    index = faiss.read_index("frame_index.faiss")

    with open("frame_metadata.pkl", "rb") as f:
        metadata = pickle.load(f)
    from .image_embedder import embed_image_text
    query_vector = embed_image_text(query)

    query_vector = np.array([query_vector]).astype("float32")

    distances, indices = index.search(query_vector, k)

    reels = []

    for idx in indices[0]:

        meta = metadata[idx]

        reel = ScrapedReel.objects.get(id=meta["reel_id"])

        reels.append(reel)

    return reels
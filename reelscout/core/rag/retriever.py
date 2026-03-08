import faiss
import pickle
import numpy as np
from .frame_retriever import search_frames
from .embedder import embed_text
from core.models import ScrapedReel, Location

INDEX_PATH = "rag_index.faiss"
META_PATH = "rag_metadata.pkl"


def detect_location(query):
    """
    Detect location or district mentioned in the query.
    """

    query = query.lower()

    locations = Location.objects.all()

    for loc in locations:

        if loc.name and loc.name.lower() in query:
            return loc

        if loc.district and loc.district.lower() in query:
            return loc

    return None


def semantic_search(query, k=10):

    # Load FAISS index
    index = faiss.read_index(INDEX_PATH)

    # Load metadata
    with open(META_PATH, "rb") as f:
        metadata = pickle.load(f)

    query_vector = embed_text(query)

    query_vector = np.array([query_vector]).astype("float32")

    distances, indices = index.search(query_vector, k)

    results = []

    for idx in indices[0]:
        if idx < len(metadata):
            results.append(metadata[idx])

    return results


def hybrid_search(query):
    """
    Hybrid search:
    1. Detect location
    2. Run semantic search
    3. Filter by location if detected
    """

    detected_location = detect_location(query)

    semantic_results = semantic_search(query)

    reels = []

    for r in semantic_results:

        try:
            reel = ScrapedReel.objects.get(id=r["reel_id"])

            if detected_location:

                if reel.location and reel.location.district == detected_location.district:
                    reels.append(reel)

            else:
                reels.append(reel)

        except ScrapedReel.DoesNotExist:
            continue

    frame_results = search_frames(query)

    all_reels = list(set(reels + frame_results))

    return all_reels[:5]
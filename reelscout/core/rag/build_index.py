import faiss
import numpy as np
import pickle

from core.models import ScrapedReel
from .embedder import embed_text
from .document_builder import build_reel_document


def build_index():

    reels = ScrapedReel.objects.filter(is_processed=True)

    embeddings = []
    metadata = []

    for reel in reels:

        doc = build_reel_document(reel)

        vector = embed_text(doc)

        embeddings.append(vector)

        metadata.append({
            "reel_id": reel.id,
            "short_code": reel.short_code,
            "location": reel.location.name if reel.location else None
        })

    if not embeddings:
        print("⚠️ No reels found to index")
        return

    embeddings = np.array(embeddings).astype("float32")

    dimension = embeddings.shape[1]

    index = faiss.IndexFlatL2(dimension)

    index.add(embeddings)

    faiss.write_index(index, "rag_index.faiss")

    with open("rag_metadata.pkl", "wb") as f:
        pickle.dump(metadata, f)

    print("✅ RAG index built successfully")
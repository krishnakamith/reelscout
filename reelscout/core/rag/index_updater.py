import faiss
import pickle
import numpy as np

from .embedder import embed_text
from .document_builder import build_reel_document


INDEX_PATH = "rag_index.faiss"
META_PATH = "rag_metadata.pkl"


def add_reel_to_index(reel):

    doc = build_reel_document(reel)

    vector = embed_text(doc)

    vector = np.array([vector]).astype("float32")

    index = faiss.read_index(INDEX_PATH)

    index.add(vector)

    faiss.write_index(index, INDEX_PATH)

    with open(META_PATH, "rb") as f:
        metadata = pickle.load(f)

    metadata.append({
        "reel_id": reel.id,
        "short_code": reel.short_code,
        "location": reel.location.name if reel.location else None
    })

    with open(META_PATH, "wb") as f:
        pickle.dump(metadata, f)

    print(f"✅ Added reel {reel.short_code} to RAG index")
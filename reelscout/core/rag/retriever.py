import faiss
import pickle
import numpy as np

from .embedder import embed_text

INDEX_PATH = "rag_index.faiss"
META_PATH = "rag_metadata.pkl"


index = faiss.read_index(INDEX_PATH)

with open(META_PATH, "rb") as f:
    metadata = pickle.load(f)


def search(query, k=5):

    query_vector = embed_text(query)

    query_vector = np.array([query_vector]).astype("float32")

    distances, indices = index.search(query_vector, k)

    results = []

    for idx in indices[0]:
        if idx < len(metadata):
            results.append(metadata[idx])

    return results
from functools import lru_cache

import numpy as np


@lru_cache(maxsize=1)
def _get_model():
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer("all-MiniLM-L6-v2")


def embed_text(text: str):
    """
    Convert text into a vector embedding.
    """
    if not text:
        text = ""

    embedding = _get_model().encode(text, normalize_embeddings=True)

    return np.array(embedding)
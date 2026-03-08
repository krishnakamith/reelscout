from sentence_transformers import SentenceTransformer
import numpy as np

# Load embedding model once
model = SentenceTransformer("all-MiniLM-L6-v2")


def embed_text(text: str):
    """
    Convert text into a vector embedding.
    """
    if not text:
        text = ""

    embedding = model.encode(text)

    return np.array(embedding)
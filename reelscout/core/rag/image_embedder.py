from functools import lru_cache

from PIL import Image


@lru_cache(maxsize=1)
def _get_model():
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer("clip-ViT-B-32")

def embed_image(image_path):

    image = Image.open(image_path).convert("RGB")

    embedding = _get_model().encode(image)

    return embedding

def embed_image_text(text):

    embedding = _get_model().encode([text])

    return embedding[0]
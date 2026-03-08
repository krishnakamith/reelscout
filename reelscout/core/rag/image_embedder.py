from sentence_transformers import SentenceTransformer
from PIL import Image

model = SentenceTransformer("clip-ViT-B-32")

def embed_image(image_path):

    image = Image.open(image_path).convert("RGB")

    embedding = model.encode(image)

    return embedding

def embed_image_text(text):

    embedding = model.encode([text])

    return embedding[0]
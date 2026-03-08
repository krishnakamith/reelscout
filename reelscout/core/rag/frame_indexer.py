import faiss
import pickle
import numpy as np

from core.models import ReelFrame
from .image_embedder import embed_image


def build_frame_index():

    frames = ReelFrame.objects.all()

    vectors = []
    metadata = []

    for frame in frames:

        path = frame.image.path

        vec = embed_image(path)

        vectors.append(vec)

        metadata.append({
            "reel_id": frame.reel.id,
            "frame_id": frame.id
        })

    vectors = np.array(vectors).astype("float32")

    index = faiss.IndexFlatL2(vectors.shape[1])
    index.add(vectors)

    faiss.write_index(index, "frame_index.faiss")

    with open("frame_metadata.pkl", "wb") as f:
        pickle.dump(metadata, f)

    print("Frame index built.")
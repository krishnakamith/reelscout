from rest_framework import serializers
import re
from .models import Location, ScrapedReel, LocationRevision, ReelFrame

AREA_CONTEXT_PATTERN = re.compile(
    r"\b(?:in|at|near|from|to)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\b"
)
AREA_SUFFIX_PATTERN = re.compile(
    r"\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)\s+"
    r"(?:panchayath|panchayat|village|town|station|junction|municipality)\b",
    re.IGNORECASE,
)
COMMENT_SCORE_PREFIX = re.compile(r"^\[SCORE:\s*\d+\]\s*\([^)]+\)\s*", re.IGNORECASE)
AREA_GENERIC_WORDS = {
    "kerala",
    "india",
    "district",
    "state",
    "railway",
    "temple",
    "church",
    "mosque",
    "beach",
    "waterfall",
    "fort",
    "dam",
    "lake",
    "hill",
    "station",
    "junction",
    "panchayath",
    "panchayat",
    "village",
    "town",
    "municipality",
}


def _normalize_area_name(value):
    text = str(value or "").strip().lower()
    if not text:
        return ""
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\b(railway|district|state)\b", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _clean_comment_text(comment_data):
    if isinstance(comment_data, dict):
        text = str(comment_data.get("text", "")).strip()
    else:
        text = str(comment_data or "").strip()
    if not text:
        return ""
    text = COMMENT_SCORE_PREFIX.sub("", text)
    return re.sub(r"\s+", " ", text).strip()


def _extract_area_candidates(text):
    candidates = []
    for match in AREA_SUFFIX_PATTERN.finditer(text):
        candidate = match.group(1).strip()
        if candidate:
            candidates.append(candidate)

    for match in AREA_CONTEXT_PATTERN.finditer(text):
        candidate = match.group(1).strip()
        if candidate:
            candidates.append(candidate)

    return candidates


def _is_valid_area_candidate(norm_candidate, location):
    if not norm_candidate:
        return False

    if norm_candidate in AREA_GENERIC_WORDS:
        return False

    if len(norm_candidate) < 3:
        return False

    district_norm = _normalize_area_name(location.district)
    if district_norm and norm_candidate == district_norm:
        return False

    location_name_norm = _normalize_area_name(location.name)
    if location_name_norm and norm_candidate in location_name_norm:
        return False

    tokens = set(norm_candidate.split())
    if tokens and tokens.issubset(AREA_GENERIC_WORDS):
        return False

    return True


def _count_area_mentions(corpus_text, norm_candidate):
    if not corpus_text or not norm_candidate:
        return 0
    pattern = r"\b" + re.escape(norm_candidate) + r"\b"
    return len(re.findall(pattern, corpus_text, flags=re.IGNORECASE))


def _format_area_display_name(norm_candidate, fallback_raw):
    norm_text = str(norm_candidate or "").strip()
    if not norm_text:
        return str(fallback_raw or "").strip()
    return " ".join(token.capitalize() for token in norm_text.split())


class ReelFrameSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ReelFrame
        fields = ['timestamp', 'image_url']

    def get_image_url(self, obj):
        request = self.context.get('request')
        if not obj.image:
            return None
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url

class ScrapedReelSerializer(serializers.ModelSerializer):
    frames = ReelFrameSerializer(many=True, read_only=True)

    class Meta:
        model = ScrapedReel
        # Added comments_dump and ai_summary for the frontend UI components
        fields = [
            'short_code', 'original_url', 'thumbnail_url',
            'author_handle', 'view_count', 'like_count',
            'comments_dump', 'ai_summary', 'selected_frame_timestamps', 'frames','extracted_general_info', 'extracted_known_facts',
        ]

class LocationRevisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = LocationRevision
        fields = ['id', 'edited_by', 'comment', 'created_at']

class LocationSerializer(serializers.ModelSerializer):
    reels = ScrapedReelSerializer(many=True, read_only=True)
    revisions = LocationRevisionSerializer(many=True, read_only=True)
    most_likely_specific_area = serializers.SerializerMethodField()

    def get_most_likely_specific_area(self, location):
        reels = list(location.reels.all())
        if not reels:
            return location.specific_area

        text_chunks = []
        for reel in reels:
            for field_value in [
                reel.raw_caption,
                reel.ai_summary,
                reel.ai_location_name,
                reel.instagram_location_name,
            ]:
                if isinstance(field_value, str) and field_value.strip():
                    text_chunks.append(field_value.strip())

            if isinstance(reel.comments_dump, list):
                for comment_data in reel.comments_dump:
                    comment_text = _clean_comment_text(comment_data)
                    if comment_text:
                        text_chunks.append(comment_text)

        if not text_chunks:
            return location.specific_area

        candidate_map = {}

        def add_candidate(raw_value):
            raw_text = str(raw_value or "").strip()
            if not raw_text:
                return
            norm = _normalize_area_name(raw_text)
            if not _is_valid_area_candidate(norm, location):
                return
            candidate_map.setdefault(norm, raw_text)

        if location.specific_area:
            add_candidate(location.specific_area)

        for chunk in text_chunks:
            for candidate in _extract_area_candidates(chunk):
                add_candidate(candidate)

        if not candidate_map:
            return location.specific_area

        full_corpus = " ".join(text_chunks)
        scores = {
            norm: _count_area_mentions(full_corpus, norm)
            for norm in candidate_map.keys()
        }

        current_norm = _normalize_area_name(location.specific_area)
        current_score = scores.get(current_norm, 0)
        if location.specific_area and current_norm and current_score == 0:
            current_score = 1

        best_norm, best_score = max(scores.items(), key=lambda item: item[1])

        if location.specific_area:
            if best_norm == current_norm:
                return location.specific_area
            if best_score <= current_score:
                return location.specific_area
            if best_score < 2:
                return location.specific_area

        if best_score <= 0:
            return location.specific_area

        return _format_area_display_name(best_norm, candidate_map[best_norm])

    class Meta:
        model = Location
        fields = [
            'id', 'name', 'slug', 'category', 'district', 'specific_area', 'alternate_names',
            'most_likely_specific_area', 'general_info', 'known_facts', 'latitude', 'longitude',
            'nearby_places', 'reels', 'revisions'
        ]

export interface LocationData {
  id: number;
  name: string;
  slug: string;
  category: string;
  district?: string | null;
  specific_area?: string | null;
  general_info: Record<string, string>;
  known_facts: Record<string, string>;
  latitude?: string | null;
  longitude?: string | null;
  reels: ReelData[];
  revisions: LocationRevision[];
}

export interface ReelData {
  short_code: string;
  original_url: string;
  thumbnail_url?: string | null;
  author_handle?: string | null;
  view_count: number;
  like_count: number;
  comments_dump?: Array<string | Record<string, unknown>> | null;
  ai_summary?: string | null;
  selected_frame_timestamps?: number[] | null;
  extracted_general_info?: Record<string, string>;
  extracted_known_facts?: Record<string, string>;
  frames?: Array<{
    timestamp: number;
    image_url?: string | null;
  }>;
}

export interface LocationRevision {
  id: number;
  edited_by: string;
  comment: string;
  created_at: string;
}


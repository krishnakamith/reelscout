import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import HeroSection from "@/components/location/HeroSection";
import BentoInsights from "@/components/location/BentoInsights";
import MapSurroundings from "@/components/location/MapSurroundings";
import CommunityPulse from "@/components/location/CommunityPulse";
import FrameGallery from "@/components/location/FrameGallery";
import VerifiedReelData from "@/components/location/VerifiedReelData";
import ChatbotCTA from "@/components/location/ChatbotCTA";
import { ArrowLeft, CircleDollarSign, Clock, Eye, Footprints, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NearbyPlace {
  name: string;
  type: string;
  distance: string;
}

interface LocationDetailResponse {
  name?: string;
  category?: string;
  district?: string;
  specific_area?: string;
  general_info?: Record<string, string>;
  known_facts?: Record<string, string>;
  reels?: ReelItem[];
  revisions?: RevisionItem[];
  latitude?: string | null;
  longitude?: string | null;
  nearby_places?: NearbyPlace[];
}

interface ReelItem {
  short_code?: string;
  ai_summary?: string;
  comments_dump?: string[];
  author_handle?: string;
  selected_frame_timestamps?: number[];
  frames?: Array<{
    timestamp: number;
    image_url?: string | null;
  }>;
}

interface RevisionItem {
  id: number;
  edited_by: string;
  comment: string;
  created_at: string;
}

interface InsightItem {
  icon: React.ElementType;
  label: string;
  value: string;
  detail?: string;
  span?: string;
}

interface ReelFactItem {
  id: string;
  category: string;
  fact: string;
  source?: string;
  verifiedCount?: number;
}

const insightIcons: React.ElementType[] = [Eye, CircleDollarSign, Footprints, Sparkles, Clock];

function prettifyLabel(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeFactText(text: string) {
  return text
    .toLowerCase()
    .replace(/\[score:\s*\d+\]\s*\([^)]+\)\s*/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const LocationDetail = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [locationName, setLocationName] = useState("Kiyomizu-dera");
  const [category, setCategory] = useState("Temple");
  const [district, setDistrict] = useState("Higashiyama District");
  const [locationText, setLocationText] = useState("Kyoto, Japan");
  const [reelCount, setReelCount] = useState(23);
  const [insights, setInsights] = useState<InsightItem[] | undefined>(undefined);
  const [facts, setFacts] = useState<ReelFactItem[] | undefined>(undefined);
  
  // New state for map and surroundings
  const [latitude, setLatitude] = useState<string | null>(null);
  const [longitude, setLongitude] = useState<string | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [communityEntries, setCommunityEntries] = useState<
    Array<{ id: string; user: string; text: string; time: string; likes?: number; tag: string }>
  >([]);
  const [galleryFrames, setGalleryFrames] = useState<
    Array<{ src: string; alt: string; reelShortCode?: string; timestamp?: number }>
  >([]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [slug]);

  const formatRelativeTime = (isoTime: string) => {
    const date = new Date(isoTime);
    if (Number.isNaN(date.getTime())) return "Recently";
    const diff = Math.max(0, Date.now() - date.getTime());
    const mins = Math.floor(diff / (1000 * 60));
    if (mins < 60) return `${mins || 1} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  };

  const parseRevision = (comment: string) => {
    const match = /^\[([^\]]+)\]\s*(.*)$/.exec(comment.trim());
    if (!match) return { tag: "Community Tip", text: comment };
    return { tag: match[1], text: match[2] };
  };

  useEffect(() => {
    if (!slug) return;

    let isMounted = true;
    setCommunityEntries([]);
    setGalleryFrames([]);

    fetch(`/api/locations/${encodeURIComponent(slug)}/`)
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to fetch location: ${response.status}`);
        return response.json();
      })
      .then((data: LocationDetailResponse) => {
        if (!isMounted) return;

        if (data?.name) {
          setLocationName(data.name);
        }
        if (data?.category?.trim()) {
          setCategory(data.category.trim());
        }

        const area = data?.specific_area?.trim();
        const districtName = data?.district?.trim();

        if (districtName) {
          setDistrict(districtName);
        }

        if (area) {
          setLocationText(area);
        } else if (data?.name) {
          setLocationText(data.name);
        }

        if (Array.isArray(data?.reels)) {
          setReelCount(data.reels.length);
        }

        // Set new map data
        if (data.latitude) setLatitude(data.latitude);
        if (data.longitude) setLongitude(data.longitude);
        if (data.nearby_places) setNearbyPlaces(data.nearby_places);

        const entries: Array<{ id: string; user: string; text: string; time: string; likes?: number; tag: string }> = [];

        if (Array.isArray(data?.revisions)) {
          data.revisions.forEach((revision) => {
            const parsed = parseRevision(revision.comment || "");
            entries.push({
              id: `revision-${revision.id}`,
              user: (revision.edited_by || "Anonymous").replace(/\s+/g, ".").toLowerCase(),
              text: parsed.text || revision.comment,
              tag: parsed.tag || "Community Tip",
              time: formatRelativeTime(revision.created_at),
            });
          });
        }

        if (Array.isArray(data?.reels)) {
          data.reels.forEach((reel, idx) => {
            const topComment = reel?.comments_dump?.[0];
            if (typeof topComment === "string" && topComment.trim()) {
              const stripped = topComment
                .replace(/\[score:\s*\d+\]\s*\([^)]+\)\s*/i, "")
                .trim();
              entries.push({
                id: `reel-comment-${reel.short_code || idx}`,
                user: (reel.author_handle || "reel.community").replace(/\s+/g, ".").toLowerCase(),
                text: stripped,
                tag: "From Reels",
                time: "Imported",
              });
            }
          });
        }

        if (entries.length > 0) {
          setCommunityEntries(entries.slice(0, 20));
        }

        if (Array.isArray(data?.reels)) {
          const selectedGalleryFrames: Array<{ src: string; alt: string; reelShortCode?: string; timestamp?: number }> = [];

          data.reels.forEach((reel, reelIndex) => {
            const reelFrames = Array.isArray(reel.frames) ? reel.frames : [];
            if (reelFrames.length === 0) return;

            const selectedSeconds = Array.isArray(reel.selected_frame_timestamps)
              ? reel.selected_frame_timestamps.slice(0, 3)
              : [];

            const chooseNearestFrame = (target: number) => {
              let nearest = reelFrames[0];
              let bestDistance = Math.abs((nearest?.timestamp ?? 0) - target);
              for (const frame of reelFrames) {
                const distance = Math.abs((frame?.timestamp ?? 0) - target);
                if (distance < bestDistance) {
                  bestDistance = distance;
                  nearest = frame;
                }
              }
              return nearest;
            };

            const picked = selectedSeconds.length > 0
              ? selectedSeconds.map((second) => chooseNearestFrame(second))
              : reelFrames.slice(0, 2);

            const perReelUnique = new Set<string>();
            picked.forEach((frame) => {
              const imageUrl = frame?.image_url;
              if (!imageUrl || perReelUnique.has(imageUrl)) return;
              perReelUnique.add(imageUrl);
              selectedGalleryFrames.push({
                src: imageUrl,
                alt: `Selected frame from reel ${reel.short_code ?? reelIndex + 1}`,
                reelShortCode: reel.short_code,
                timestamp: typeof frame.timestamp === "number" ? frame.timestamp : undefined,
              });
            });
          });

          if (selectedGalleryFrames.length > 0) {
            setGalleryFrames(selectedGalleryFrames.slice(0, 18));
          }
        }

        const mappedInsights: InsightItem[] = [];
        if (data?.general_info) {
          Object.entries(data.general_info)
            .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
            .slice(0, 6)
            .forEach(([key, value], index) => {
              mappedInsights.push({
                icon: insightIcons[index % insightIcons.length],
                label: prettifyLabel(key),
                value: value.trim(),
                span: index === 0 ? "col-span-1 sm:col-span-2" : "col-span-1",
              });
            });
        }
        if (mappedInsights.length > 0) {
          setInsights(mappedInsights);
        }

        if (Array.isArray(data?.reels)) {
          const groupedFacts = new Map<string, ReelFactItem>();

          if (data?.known_facts) {
            Object.entries(data.known_facts)
              .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
              .forEach(([key, value], index) => {
                const factText = value.trim();
                const normalized = normalizeFactText(`${key} ${factText}`);
                const existing = groupedFacts.get(normalized);
                if (existing) {
                  existing.verifiedCount = (existing.verifiedCount ?? 1) + 1;
                  return;
                }
                groupedFacts.set(normalized, {
                  id: `known-fact-${index}`,
                  category: prettifyLabel(key),
                  fact: factText,
                  source: "Location knowledge base",
                  verifiedCount: 1,
                });
              });
          }

          data.reels.forEach((reel, index) => {
            if (typeof reel?.ai_summary === "string" && reel.ai_summary.trim()) {
              const factText = reel.ai_summary.trim();
              const key = `AI Summary::${normalizeFactText(factText)}`;
              const existing = groupedFacts.get(key);
              if (existing) {
                existing.verifiedCount = (existing.verifiedCount ?? 1) + 1;
              } else {
                groupedFacts.set(key, {
                  id: `summary-${reel.short_code ?? index}`,
                  category: "AI Summary",
                  fact: factText,
                  source: reel.short_code ? `Reel ${reel.short_code}` : undefined,
                  verifiedCount: 1,
                });
              }
            }
          });

          const mappedFacts = Array.from(groupedFacts.values()).sort(
            (a, b) => (b.verifiedCount ?? 1) - (a.verifiedCount ?? 1)
          );

          if (mappedFacts.length > 0) {
            setFacts(mappedFacts.slice(0, 8));
          }
        }
      })
      .catch((error) => console.error("Error fetching location detail:", error));

    return () => {
      isMounted = false;
    };
  }, [slug]);

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Button
            variant="ghost"
            onClick={() => navigate("/", { state: { scrollToMap: true } })}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Map
          </Button>
        </div>
      </header>
      <HeroSection
        locationName={locationName}
        category={category}
        district={district}
        locationText={locationText}
        reelCount={reelCount}
      />
      <BentoInsights
        insights={insights}
      />
      <VerifiedReelData
        facts={facts}
        reelCount={reelCount}
      />
      <MapSurroundings 
        locationSlug={slug}
        latitude={latitude}
        longitude={longitude}
        initialPlaces={nearbyPlaces}
      />
      <CommunityPulse locationSlug={slug} initialEntries={communityEntries} />
      <FrameGallery frames={galleryFrames} />
      <ChatbotCTA />
    </main>
  );
};

export default LocationDetail;

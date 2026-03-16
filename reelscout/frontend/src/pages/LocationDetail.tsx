// reelscout/frontend/src/pages/LocationDetail.tsx
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
  comments_dump?: string[];
  author_handle?: string;
  selected_frame_timestamps?: number[];
  extracted_general_info?: Record<string, string>;
  extracted_known_facts?: Record<string, string>;
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

function getReelSourceId(reel: ReelItem, index: number) {
  return reel.short_code?.trim() || `reel-${index}`;
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

          // ==========================================
          // 1. DYNAMICALLY AGGREGATE INSIGHTS (GENERAL INFO)
          // ==========================================
          const insightMap = new Map<string, { label: string; value: string; reelSources: Set<string> }>();

          // Fallback: load legacy master location data first so it isn't lost
          if (data?.general_info) {
             Object.entries(data.general_info).forEach(([key, val]) => {
                if (typeof val === "string" && val.trim()) {
                   const label = prettifyLabel(key);
                   const normKey = label.toLowerCase();
                   insightMap.set(normKey, { label, value: val.trim(), reelSources: new Set<string>() });
                }
             });
          }

          // Iterate through every reel to extract and stack its subjective info
          data.reels.forEach((reel, reelIndex) => {
            const reelSourceId = getReelSourceId(reel, reelIndex);
            if (reel.extracted_general_info) {
              Object.entries(reel.extracted_general_info).forEach(([key, val]) => {
                if (typeof val === "string" && val.trim()) {
                  const label = prettifyLabel(key);
                  const normKey = label.toLowerCase();

                  if (insightMap.has(normKey)) {
                    const existing = insightMap.get(normKey)!;
                    existing.reelSources.add(reelSourceId);
                    
                    // Keep the most descriptive value
                    if (val.trim().length > existing.value.length) {
                       existing.value = val.trim();
                    }
                  } else {
                    insightMap.set(normKey, {
                      label,
                      value: val.trim(),
                      reelSources: new Set<string>([reelSourceId]),
                    });
                  }
                }
              });
            }
          });

          // Sort by highest verification count, format for BentoInsights
          const mappedInsights = Array.from(insightMap.values())
            .sort((a, b) => b.reelSources.size - a.reelSources.size)
            .map((item, index) => {
              const verifiedCount = item.reelSources.size;
              return {
                icon: insightIcons[index % insightIcons.length],
                label: item.label,
                value: item.value,
                detail: verifiedCount > 1 ? `Verified in ${verifiedCount} reels` : undefined,
                span: index === 0 ? "col-span-1 sm:col-span-2" : "col-span-1",
              };
            });

          if (mappedInsights.length > 0) {
            setInsights(mappedInsights);
          }

          // ==========================================
          // 2. DYNAMICALLY AGGREGATE KNOWN FACTS
          // ==========================================
          const groupedFacts = new Map<string, ReelFactItem & { reelSources: Set<string> }>();

          // Fallback: load legacy master known facts
          if (data?.known_facts) {
             Object.entries(data.known_facts).forEach(([key, val], index) => {
                if (typeof val === "string" && val.trim()) {
                    const normKey = prettifyLabel(key).toLowerCase();
                    groupedFacts.set(normKey, {
                        id: `known-fact-base-${index}`,
                        category: prettifyLabel(key),
                        fact: val.trim(),
                        source: "Location knowledge base",
                        reelSources: new Set<string>(),
                    });
                }
             });
          }

          data.reels.forEach((reel, index) => {
            const reelSourceId = getReelSourceId(reel, index);

            // A. Grab objective facts strictly from this reel
            if (reel.extracted_known_facts) {
              Object.entries(reel.extracted_known_facts).forEach(([key, val]) => {
                if (typeof val === "string" && val.trim()) {
                  // Group purely by the Category Key so identical topics stack!
                  const normKey = prettifyLabel(key).toLowerCase();

                  if (groupedFacts.has(normKey)) {
                    const existing = groupedFacts.get(normKey)!;
                    existing.reelSources.add(reelSourceId);
                    
                    // If this reel's fact string is more detailed/longer, use it as the display text
                    if (val.trim().length > existing.fact.length) {
                       existing.fact = val.trim();
                    }
                  } else {
                    groupedFacts.set(normKey, {
                      id: `reel-fact-${reel.short_code ?? index}-${key}`,
                      category: prettifyLabel(key),
                      fact: val.trim(),
                      source: reel.short_code ? `Reel ${reel.short_code}` : "User Reel",
                      reelSources: new Set<string>([reelSourceId]),
                    });
                  }
                }
              });
            }

          });

          // Sort the facts by highest verified count first
          const mappedFacts = Array.from(groupedFacts.values())
            .map(({ reelSources, ...item }) => {
              const verifiedCount = reelSources.size;
              return {
                ...item,
                verifiedCount: verifiedCount > 1 ? verifiedCount : undefined,
              };
            })
            .sort((a, b) => (b.verifiedCount ?? 0) - (a.verifiedCount ?? 0));

          if (mappedFacts.length > 0) {
            setFacts(mappedFacts);
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
      <MapSurroundings 
        locationSlug={slug}
        latitude={latitude}
        longitude={longitude}
        initialPlaces={nearbyPlaces}
      />
      <VerifiedReelData
        facts={facts}
        reelCount={reelCount}
      />
      <CommunityPulse locationSlug={slug} initialEntries={communityEntries} />
      <FrameGallery frames={galleryFrames} />
      <ChatbotCTA />
    </main>
  );
};

export default LocationDetail;

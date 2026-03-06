import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import HeroSection from "@/components/location/HeroSection";
import BentoInsights from "@/components/location/BentoInsights";
import MapSurroundings from "@/components/location/MapSurroundings";
import CommunityPulse from "@/components/location/CommunityPulse";
import FrameGallery from "@/components/location/FrameGallery";
import VerifiedReelData from "@/components/location/VerifiedReelData";
import ChatbotCTA from "@/components/location/ChatbotCTA";
import { CircleDollarSign, Clock, Eye, Footprints, Sparkles } from "lucide-react";

interface LocationDetailResponse {
  name?: string;
  district?: string;
  specific_area?: string;
  description?: string;
  best_time_to_visit?: string;
  extracted_tips?: Record<string, string>;
  reels?: ReelItem[];
}

interface ReelItem {
  short_code?: string;
  ai_summary?: string;
  comments_dump?: string[];
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
  const { slug } = useParams();
  const [locationName, setLocationName] = useState("Kiyomizu-dera");
  const [district, setDistrict] = useState("Higashiyama District");
  const [locationText, setLocationText] = useState("Kyoto, Japan");
  const [reelCount, setReelCount] = useState(23);
  const [insights, setInsights] = useState<InsightItem[] | undefined>(undefined);
  const [facts, setFacts] = useState<ReelFactItem[] | undefined>(undefined);

  useEffect(() => {
    if (!slug) return;

    let isMounted = true;

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

        const mappedInsights: InsightItem[] = [];
        if (data?.description?.trim()) {
          mappedInsights.push({
            icon: Eye,
            label: "Overview",
            value: data.description.trim(),
            span: "col-span-1 sm:col-span-2",
          });
        }
        if (data?.best_time_to_visit?.trim()) {
          mappedInsights.push({
            icon: Clock,
            label: "Best Time",
            value: data.best_time_to_visit.trim(),
            span: "col-span-1",
          });
        }
        if (data?.extracted_tips) {
          Object.entries(data.extracted_tips)
            .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
            .slice(0, 4)
            .forEach(([key, value], index) => {
              mappedInsights.push({
                icon: insightIcons[index % insightIcons.length],
                label: prettifyLabel(key),
                value: value.trim(),
                span: "col-span-1",
              });
            });
        }
        if (mappedInsights.length > 0) {
          setInsights(mappedInsights);
        }

        if (Array.isArray(data?.reels)) {
          const groupedFacts = new Map<string, ReelFactItem>();
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

            const topComment = reel?.comments_dump?.[0];
            if (typeof topComment === "string" && topComment.trim()) {
              const factText = topComment.trim();
              const key = `Community Note::${normalizeFactText(factText)}`;
              const existing = groupedFacts.get(key);
              if (existing) {
                existing.verifiedCount = (existing.verifiedCount ?? 1) + 1;
              } else {
                groupedFacts.set(key, {
                  id: `comment-${reel.short_code ?? index}`,
                  category: "Community Note",
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
      <HeroSection
        locationName={locationName}
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
      <MapSurroundings />
      <CommunityPulse />
      <FrameGallery />
      <ChatbotCTA />
    </main>
  );
};

export default LocationDetail;

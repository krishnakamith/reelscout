import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocationData } from "../types/location";

import { HeroSection } from "../components/location/HeroSection";
import { QuickStats } from "../components/location/QuickStats";
import { AboutSection } from "../components/location/AboutSection";
import { TipsSection } from "../components/location/TipsSection";
import { MapSection } from "../components/location/MapSection";
import { CommunitySection } from "../components/location/CommunitySection";
import { CTASection } from "../components/location/CTASection";

interface ApiReel {
  short_code: string;
  original_url?: string | null;
  thumbnail_url?: string | null;
  author_handle?: string | null;
  comments_dump?: string[] | null;
  ai_summary?: string | null;
}

interface ApiLocationResponse {
  id: number;
  name: string;
  slug: string;
  category?: string | null;
  description?: string | null;
  how_to_reach?: string | null;
  best_time_to_visit?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  extracted_tips?: Record<string, unknown> | null;
  reels?: ApiReel[];
}

export default function LocationDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const response = await fetch(`/api/locations/${slug}/`);
        
        if (!response.ok) {
          throw new Error("Location not found");
        }
        
        const data: ApiLocationResponse = await response.json();
        
        const firstReel = data.reels && data.reels.length > 0 ? data.reels[0] : null;

        const formattedTips = data.extracted_tips 
          ? Object.entries(data.extracted_tips).map(([key, value]) => {
              const cleanKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              return `${cleanKey}: ${value}`;
            })
          : [];

        // Map backend response to the full LocationData shape expected by all UI sections
        const formattedData: LocationData = {
          id: String(data.id),
          name: data.name,
          tagline: firstReel?.ai_summary || "Discovered through community reels",
          description: data.description || "No description available yet.",
          address: data.name,
          region: data.category || "Kerala",
          country: "India",
          category: data.category || "Hidden Gem",
          hiddenGemScore: 82,
          coordinates: { 
            lat: parseFloat(data.latitude) || 0, 
            lng: parseFloat(data.longitude) || 0 
          },
          
          reelUrl: firstReel?.original_url || "",
          reelAuthor: firstReel?.author_handle || "ReelScout Traveler",
          reelAuthorHandle: firstReel?.author_handle ? `@${firstReel.author_handle}` : "@reelscout",
          extractedAt: new Date().toISOString(),
          bestTimeToVisit: data.best_time_to_visit || "January to December",
          estimatedDuration: "2-4 hours",
          difficultyLevel: "Easy",
          accessibility: data.how_to_reach || "Getting here is part of the adventure.",
          entryFee: "Check locally",
          
          tips: formattedTips.length ? formattedTips : ["Carry water and wear comfortable shoes."],
          highlights: [
            data.category ? `Category: ${data.category}` : "Community-discovered location",
            data.how_to_reach ? "Travel directions available" : "Directions coming soon",
          ],
          warnings: ["Check weather and local access before your trip."],
          nearbyPlaces: [],
          
          communityInsights: firstReel?.comments_dump?.map((comment: string, index: number) => ({
            id: index.toString(),
            author: "Traveler", 
            content: comment,
            date: new Date().toISOString(),
            helpful: 0,
            verified: true
          })) || [],
          
          images: data.reels?.map((r) => r.thumbnail_url).filter(Boolean) as string[] || ["/placeholder.svg"],
          videoThumbnail: firstReel?.thumbnail_url || "/placeholder.svg",
        };
        
        setLocationData(formattedData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchLocation();
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !locationData) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <h2 className="text-2xl font-display font-bold text-foreground">Location Not Found</h2>
        <Button onClick={() => navigate("/")} variant="outline" className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Return to Map
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <HeroSection location={locationData} />
      
      <div className="container mx-auto px-4 py-12">
        <QuickStats location={locationData} />
        
        <div className="grid lg:grid-cols-3 gap-12 mt-12">
          <div className="lg:col-span-2 space-y-12">
            <AboutSection location={locationData} />
            <MapSection location={locationData} />
          </div>
          
          <div className="space-y-12">
            <TipsSection location={locationData} />
            <CommunitySection location={locationData} />
          </div>
        </div>
      </div>
      
      <CTASection />
    </div>
  );
}

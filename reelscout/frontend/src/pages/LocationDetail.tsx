import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import HeroSection from "@/components/location/HeroSection";
import BentoInsights from "@/components/location/BentoInsights";
import MapSurroundings from "@/components/location/MapSurroundings";
import CommunityPulse from "@/components/location/CommunityPulse";
import FrameGallery from "@/components/location/FrameGallery";
import VerifiedReelData from "@/components/location/VerifiedReelData";
import ChatbotCTA from "@/components/location/ChatbotCTA";

interface LocationDetailResponse {
  name?: string;
  district?: string;
  specific_area?: string;
  reels?: Array<unknown>;
}

const LocationDetail = () => {
  const { slug } = useParams();
  const [locationName, setLocationName] = useState("Kiyomizu-dera");
  const [locationText, setLocationText] = useState("Kyoto, Japan");
  const [reelCount, setReelCount] = useState(23);

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
        const district = data?.district?.trim();
        const fullLocation = [area, district].filter(Boolean).join(", ");

        if (fullLocation) {
          setLocationText(fullLocation);
        } else if (data?.name) {
          setLocationText(data.name);
        }

        if (Array.isArray(data?.reels)) {
          setReelCount(data.reels.length);
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
        locationText={locationText}
        reelCount={reelCount}
      />
      <BentoInsights />
      <VerifiedReelData />
      <MapSurroundings />
      <CommunityPulse />
      <FrameGallery />
      <ChatbotCTA />
    </main>
  );
};

export default LocationDetail;

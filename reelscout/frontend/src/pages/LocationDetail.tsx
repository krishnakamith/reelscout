import HeroSection from "@/components/location/HeroSection";
import BentoInsights from "@/components/location/BentoInsights";
import MapSurroundings from "@/components/location/MapSurroundings";
import CommunityPulse from "@/components/location/CommunityPulse";
import FrameGallery from "@/components/location/FrameGallery";
import VerifiedReelData from "@/components/location/VerifiedReelData";
import ChatbotCTA from "@/components/location/ChatbotCTA";

const LocationDetail = () => {
  return (
    <main className="min-h-screen bg-background">
      <HeroSection />
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

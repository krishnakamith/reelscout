import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import heroDefaultImage from "@/assets/hero-default.jpg";
import heroTempleImage from "@/assets/hero-temple.jpg";
import heroSacredImage from "@/assets/hero-sacred.jpg";
import heroWaterfallImage from "@/assets/hero-waterfall.jpg";
import heroBeachImage from "@/assets/hero-beach.jpg";
import heroHeritageImage from "@/assets/hero-heritage.jpg";
import heroHillsImage from "@/assets/hero-hills.jpg";
import heroViewpointImage from "@/assets/hero-viewpoint.jpg";
import heroWaterbodyImage from "@/assets/hero-waterbody.jpg";
import heroRiverImage from "@/assets/hero-river.jpg";
import heroForestImage from "@/assets/hero-forest.jpg";

interface HeroSectionProps {
  locationName?: string;
  category?: string;
  district?: string;
  locationText?: string;
  reelCount?: number;
}

function pickHeroImage(category?: string, locationName?: string) {
  const categoryText = String(category || "").trim().toLowerCase();
  const locationText = String(locationName || "").trim().toLowerCase();
  const categoryCompact = categoryText.replace(/[\s_-]+/g, "");
  const locationCompact = locationText.replace(/[\s_-]+/g, "");
  const hasAny = (text: string, patterns: string[]) => patterns.some((pattern) => text.includes(pattern));

  // 1) Prefer explicit category mapping when available.
  if (categoryText.includes("waterfall") || categoryText.includes("falls") || categoryCompact.includes("waterfall")) return heroWaterfallImage;
  if (
    hasAny(categoryText, ["beach", "shore", "coast", "coastal", "bay", "harbour", "harbor", "seaside", "sea side", "island"])
    || categoryCompact.includes("seaside")
  ) return heroBeachImage;
  if (categoryText.includes("temple")) return heroTempleImage;
  if (categoryText.includes("church") || categoryText.includes("mosque")) return heroSacredImage;
  if (categoryText.includes("fort") || categoryText.includes("cave")) return heroHeritageImage;
  if (categoryText.includes("hill station") || categoryCompact.includes("hillstation")) return heroViewpointImage;
  if (categoryText.includes("viewpoint") || categoryText.includes("view point")) return heroViewpointImage;
  if (categoryText.includes("hill") || categoryText.includes("mountain")) return heroHillsImage;
  if (categoryText.includes("river") || categoryCompact.includes("river")) return heroRiverImage;
  if (categoryText.includes("lake") || categoryText.includes("dam") || categoryText.includes("water")) return heroWaterbodyImage;
  if (categoryText.includes("park")) return heroDefaultImage;

  // 2) Fallback to location-name keyword mapping.
  if (locationText.includes("waterfall") || locationText.includes("falls") || locationCompact.includes("waterfall")) return heroWaterfallImage;
  if (
    locationText.includes("beach")
    || locationText.includes("shore")
    || locationText.includes("coast")
    || locationText.includes("coastal")
    || locationText.includes("bay")
    || locationText.includes("harbour")
    || locationText.includes("harbor")
  ) return heroBeachImage;
  if (locationText.includes("temple")) return heroTempleImage;
  if (locationText.includes("church") || locationText.includes("mosque")) return heroSacredImage;
  if (locationText.includes("fort") || locationText.includes("cave")) return heroHeritageImage;
  if (locationText.includes("hill station") || locationCompact.includes("hillstation")) return heroViewpointImage;
  if (locationText.includes("viewpoint") || locationText.includes("view point")) return heroViewpointImage;
  if (locationText.includes("hill") || locationText.includes("mountain")) return heroHillsImage;
  if (locationText.includes("river") || locationCompact.includes("river")) return heroRiverImage;
  if (locationText.includes("lake") || locationText.includes("dam") || locationText.includes("water")) return heroWaterbodyImage;
  if (locationText.includes("park")) return heroDefaultImage;

  return heroForestImage;
}

const HeroSection = ({
  locationName = "Kiyomizu-dera",
  category = "Temple",
  district = "Higashiyama District",
  locationText = "Kyoto, Japan",
  reelCount = 23,
}: HeroSectionProps) => {
  const heroImageSrc = pickHeroImage(category, locationName);

  return (
    <section className="relative h-[70vh] min-h-[500px] w-full overflow-hidden">
      <img
        src={heroImageSrc}
        alt="Location hero"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, hsla(30, 10%, 8%, 0.05) 0%, hsla(30, 10%, 8%, 0.8) 100%)" }}
      />
      <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 lg:p-16">
        <div className="section-container">
          <div className="flex flex-wrap gap-2 mb-4 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <Badge className="bg-primary/90 text-primary-foreground border-none px-3 py-1 text-xs font-medium tracking-wide">
              {category}
            </Badge>
            <Badge className="bg-accent/90 text-accent-foreground border-none px-3 py-1 text-xs font-medium tracking-wide">
              {district}
            </Badge>
          </div>
          <h1
            className="font-serif text-4xl sm:text-5xl lg:text-7xl text-muted leading-[1.1] mb-3 opacity-0 animate-fade-in-up"
            style={{ animationDelay: "0.25s", color: "hsl(40, 20%, 95%)" }}
          >
            {locationName}
          </h1>
          <p
            className="text-sm sm:text-base max-w-lg opacity-0 animate-fade-in-up"
            style={{ animationDelay: "0.4s", color: "hsl(40, 15%, 75%)" }}
          >
            <MapPin className="inline w-4 h-4 mr-1 -mt-0.5" />
            {locationText} · Discovered from {reelCount} reels
          </p>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

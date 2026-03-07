import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import heroImage from "@/assets/hero-location.jpg";
import heroImage1 from "@/assets/hero-location (1).jpg";
import heroImage2 from "@/assets/hero-location (2).jpg";
import heroImage3 from "@/assets/hero-location (3).jpg";
import heroImage4 from "@/assets/hero-location (4).jpg";
import heroImage5 from "@/assets/hero-location (5).jpg";
import heroImage6 from "@/assets/hero-location (6).jpg";
import heroImage7 from "@/assets/hero-location (7).jpg";

interface HeroSectionProps {
  locationName?: string;
  category?: string;
  district?: string;
  locationText?: string;
  reelCount?: number;
}

function pickHeroImage(category?: string) {
  const normalized = String(category || "").trim().toLowerCase();

  const categoryImageMap: Record<string, string> = {
    temple: heroImage1,
    church: heroImage2,
    mosque: heroImage2,
    waterfall: heroImage3,
    beach: heroImage4,
    fort: heroImage5,
    cave: heroImage5,
    "hill station": heroImage6,
    viewpoint: heroImage6,
    lake: heroImage7,
    dam: heroImage7,
    park: heroImage,
  };

  return categoryImageMap[normalized] || heroImage;
}

const HeroSection = ({
  locationName = "Kiyomizu-dera",
  category = "Temple",
  district = "Higashiyama District",
  locationText = "Kyoto, Japan",
  reelCount = 23,
}: HeroSectionProps) => {
  const heroImageSrc = pickHeroImage(category);

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

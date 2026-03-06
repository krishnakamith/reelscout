import { MapPin, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import heroImage from "@/assets/hero-location.jpg";

interface HeroSectionProps {
  locationName?: string;
  locationText?: string;
  reelCount?: number;
}

const HeroSection = ({
  locationName = "Kiyomizu-dera",
  locationText = "Kyoto, Japan",
  reelCount = 23,
}: HeroSectionProps) => {
  return (
    <section className="relative h-[70vh] min-h-[500px] w-full overflow-hidden">
      <img
        src={heroImage}
        alt="Kiyomizu-dera Temple surrounded by mountains"
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
              Temple
            </Badge>
            <Badge className="bg-accent/90 text-accent-foreground border-none px-3 py-1 text-xs font-medium tracking-wide">
              Higashiyama District
            </Badge>
            <Badge variant="outline" className="border-muted-foreground/30 text-muted/90 px-3 py-1 text-xs backdrop-blur-sm">
              <Star className="w-3 h-3 mr-1 fill-current" /> 4.8
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

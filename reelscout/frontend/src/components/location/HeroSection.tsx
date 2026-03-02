import { MapPin, Gem, Share2, Heart, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LocationData } from '@/types/location';
import heroImage from '@/assets/hero-location.jpg';

interface HeroSectionProps {
  location: LocationData;
}

export const HeroSection = ({ location }: HeroSectionProps) => {
  const scrollToContent = () => {
    document.getElementById('content')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative h-screen min-h-[600px] w-full overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt={location.name}
          className="h-full w-full object-cover"
        />
        <div className="hero-gradient absolute inset-0" />
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 flex h-full flex-col justify-between px-6 py-8 md:px-12 lg:px-24">
        {/* Top Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
              <Gem className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-serif text-xl font-semibold text-primary-foreground">
              ReelScout
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              className="rounded-full bg-primary-foreground/10 backdrop-blur-sm hover:bg-primary-foreground/20 text-primary-foreground"
            >
              <Share2 className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="rounded-full bg-primary-foreground/10 backdrop-blur-sm hover:bg-primary-foreground/20 text-primary-foreground"
            >
              <Heart className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-3xl">
          <div className="mb-4 flex flex-wrap items-center gap-3 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <Badge className="bg-gold text-accent-foreground border-0 px-3 py-1">
              <Gem className="mr-1.5 h-3 w-3" />
              Hidden Gem Score: {location.hiddenGemScore}%
            </Badge>
            <Badge variant="outline" className="border-primary-foreground/30 text-primary-foreground backdrop-blur-sm">
              {location.category}
            </Badge>
          </div>

          <h1 className="mb-3 font-serif text-5xl font-bold text-primary-foreground md:text-6xl lg:text-7xl animate-fade-up" style={{ animationDelay: '0.2s' }}>
            {location.name}
          </h1>
          
          <p className="mb-6 font-serif text-xl text-primary-foreground/90 italic md:text-2xl animate-fade-up" style={{ animationDelay: '0.3s' }}>
            "{location.tagline}"
          </p>

          <div className="flex items-center gap-2 text-primary-foreground/80 animate-fade-up" style={{ animationDelay: '0.4s' }}>
            <MapPin className="h-5 w-5" />
            <span className="text-lg">
              {location.address}, {location.region}, {location.country}
            </span>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="flex justify-center">
          <button 
            onClick={scrollToContent}
            className="flex flex-col items-center gap-2 text-primary-foreground/70 transition-colors hover:text-primary-foreground animate-fade-up"
            style={{ animationDelay: '0.5s' }}
          >
            <span className="text-sm font-medium">Explore</span>
            <ChevronDown className="h-6 w-6 animate-bounce" />
          </button>
        </div>
      </div>
    </section>
  );
};

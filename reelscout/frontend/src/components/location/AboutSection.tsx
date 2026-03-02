import { useState } from 'react';
import { ExternalLink, Instagram, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LocationData } from '@/types/location';

interface AboutSectionProps {
  location: LocationData;
}

export const AboutSection = ({ location }: AboutSectionProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const images = location.images;

  const goTo = (index: number) => {
    setCurrentIndex((index + images.length) % images.length);
  };

  return (
    <section className="px-6 py-16 md:px-12 lg:px-24">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-3">
        {/* Main Description */}
        <div className="lg:col-span-2">
          <h2 className="mb-6 font-serif text-3xl font-bold text-foreground md:text-4xl">
            About This Place
          </h2>
          <div className="prose prose-lg max-w-none text-muted-foreground">
            {location.description.split('\n\n').map((paragraph, index) => (
              <p key={index} className="mb-4 leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
          
          {/* Accessibility Info */}
          <div className="mt-8 rounded-xl bg-muted/50 p-6">
            <h3 className="mb-3 font-semibold text-foreground">Accessibility</h3>
            <p className="text-muted-foreground">{location.accessibility}</p>
          </div>
        </div>

        {/* Picture Carousel Card */}
        <div className="lg:col-span-1">
          <Card className="overflow-hidden border-0 shadow-card">
            <div className="relative aspect-[3/4] bg-muted">
              <img
                src={images[currentIndex]}
                alt={`${location.name} - Photo ${currentIndex + 1}`}
                className="h-full w-full object-cover transition-opacity duration-300"
              />
              
              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => goTo(currentIndex - 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-background/70 backdrop-blur-sm text-foreground transition-colors hover:bg-background/90"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => goTo(currentIndex + 1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-background/70 backdrop-blur-sm text-foreground transition-colors hover:bg-background/90"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}

              {/* Dot Indicators */}
              {images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goTo(i)}
                      className={`h-2 w-2 rounded-full transition-all ${
                        i === currentIndex
                          ? 'bg-primary-foreground scale-125'
                          : 'bg-primary-foreground/50'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Instagram badge */}
              <div className="absolute bottom-8 left-0 right-0 bg-gradient-to-t from-charcoal/80 to-transparent p-4">
                <div className="flex items-center gap-2">
                  <Instagram className="h-5 w-5 text-primary-foreground" />
                  <span className="text-sm font-medium text-primary-foreground">
                    From Reel
                  </span>
                </div>
              </div>
            </div>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{location.reelAuthor}</p>
                  <p className="text-sm text-muted-foreground">{location.reelAuthorHandle}</p>
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  View
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Extracted on {new Date(location.extractedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

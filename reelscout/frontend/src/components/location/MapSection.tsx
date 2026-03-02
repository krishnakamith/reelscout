import { MapPin, Navigation, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LocationData, NearbyPlace } from '@/types/location';
import { useState } from 'react';

interface MapSectionProps {
  location: LocationData;
}

const getPlaceIcon = (type: NearbyPlace['type']) => {
  switch (type) {
    case 'restaurant':
      return '🍽️';
    case 'hotel':
      return '🏨';
    case 'attraction':
      return '🎯';
    case 'transport':
      return '🚌';
    default:
      return '📍';
  }
};

export const MapSection = ({ location }: MapSectionProps) => {
  const [copied, setCopied] = useState(false);
  
  const coordinates = `${location.coordinates.lat}, ${location.coordinates.lng}`;
  
  const copyCoordinates = () => {
    navigator.clipboard.writeText(coordinates);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openInMaps = () => {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${location.coordinates.lat},${location.coordinates.lng}`,
      '_blank'
    );
  };

  return (
    <section className="px-6 py-16 md:px-12 lg:px-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-10 font-serif text-3xl font-bold text-foreground md:text-4xl">
          Location & Nearby
        </h2>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Map Placeholder */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden border-0 shadow-card">
              <div className="relative aspect-video bg-muted">
                {/* Map Embed - In production, use Google Maps or Mapbox */}
                <iframe
                  title="Location Map"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${location.coordinates.lat},${location.coordinates.lng}&zoom=14`}
                />
              </div>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">{location.address}</p>
                      <p className="text-sm text-muted-foreground">{coordinates}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2"
                      onClick={copyCoordinates}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-secondary" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                    <Button 
                      size="sm" 
                      className="gap-2"
                      onClick={openInMaps}
                    >
                      <Navigation className="h-4 w-4" />
                      Directions
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Nearby Places */}
          <div className="lg:col-span-1">
            <h3 className="mb-4 font-semibold text-foreground">Nearby Places</h3>
            <div className="space-y-3">
              {location.nearbyPlaces.map((place, index) => (
                <Card 
                  key={index} 
                  className="border-0 shadow-sm transition-all hover:shadow-card cursor-pointer"
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <span className="text-2xl">{getPlaceIcon(place.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{place.name}</p>
                      <p className="text-sm text-muted-foreground">{place.distance}</p>
                    </div>
                    {place.rating && (
                      <div className="flex items-center gap-1 text-sm">
                        <span className="text-gold">★</span>
                        <span className="font-medium">{place.rating}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

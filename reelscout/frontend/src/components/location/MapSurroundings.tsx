import { MapPin, Coffee, ShoppingBag, Landmark, UtensilsCrossed } from "lucide-react";

const nearbyPlaces = [
  { name: "Sannen-zaka Steps", type: "Landmark", icon: Landmark, distance: "2 min walk" },
  { name: "% Arabica Kyoto", type: "Café", icon: Coffee, distance: "5 min walk" },
  { name: "Ninen-zaka Street", type: "Shopping", icon: ShoppingBag, distance: "3 min walk" },
  { name: "Kasagi-ya", type: "Restaurant", icon: UtensilsCrossed, distance: "6 min walk" },
  { name: "Yasaka Pagoda", type: "Landmark", icon: Landmark, distance: "8 min walk" },
  { name: "Gion Corner", type: "Cultural", icon: Landmark, distance: "15 min walk" },
];

const MapSurroundings = () => {
  return (
    <section className="py-16 sm:py-20 bg-secondary/40">
      <div className="section-container">
        <h2 className="font-serif text-3xl sm:text-4xl text-foreground mb-2">
          Map & Surroundings
        </h2>
        <p className="text-muted-foreground mb-8 text-sm">
          Explore what's around — extracted from reel mentions
        </p>

        {/* Map Placeholder */}
        <div className="relative w-full h-72 sm:h-96 rounded-2xl overflow-hidden bg-muted mb-10">
          <div className="absolute inset-0 flex items-center justify-center flex-col gap-3">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="w-7 h-7 text-primary" />
            </div>
            <span className="text-muted-foreground text-sm font-medium">
              Interactive map coming soon
            </span>
            <span className="text-xs text-muted-foreground/60">
              34.9949° N, 135.7850° E
            </span>
          </div>
          {/* Decorative grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        {/* Nearby Places */}
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Mentioned Nearby
        </h3>
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
          {nearbyPlaces.map((place, i) => (
            <div key={i} className="nearby-card">
              <div className="p-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <place.icon className="w-5 h-5 text-primary" />
                </div>
                <h4 className="text-sm font-semibold text-foreground mb-1">
                  {place.name}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {place.type} · {place.distance}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MapSurroundings;

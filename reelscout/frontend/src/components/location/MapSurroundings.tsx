import { useState, useEffect } from "react";
import { MapPin, Coffee, ShoppingBag, Landmark, UtensilsCrossed, Edit2, Check, Plus, Trash, Info } from "lucide-react";

// Helper to pick icons dynamically based on the place "type"
const getIconForType = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes("caf") || t.includes("coffee") || t.includes("juice")) return Coffee;
  if (t.includes("shop") || t.includes("souvenir") || t.includes("store")) return ShoppingBag;
  if (t.includes("restaurant") || t.includes("food") || t.includes("eat")) return UtensilsCrossed;
  return Landmark; // Default icon
};

interface NearbyPlace {
  name: string;
  type: string;
  distance: string;
}

interface MapSurroundingsProps {
  locationSlug?: string;
  latitude?: string | null;
  longitude?: string | null;
  initialPlaces?: NearbyPlace[];
}

const MapSurroundings = ({ locationSlug, latitude, longitude, initialPlaces = [] }: MapSurroundingsProps) => {
  const [places, setPlaces] = useState<NearbyPlace[]>(initialPlaces);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state if props load after initial render
  useEffect(() => {
    if (initialPlaces && initialPlaces.length > 0) {
      setPlaces(initialPlaces);
    }
  }, [initialPlaces]);

  // Fallback coordinates if none are provided
  const lat = latitude ? parseFloat(latitude) : 34.9949;
  const lng = longitude ? parseFloat(longitude) : 135.7850;

  const handleSave = async () => {
    if (!locationSlug) return;
    setIsSaving(true);
    
    try {
      // Assuming you have a standard DRF generic view, PATCH will update just this field
      const response = await fetch(`/api/locations/${locationSlug}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          // 'X-CSRFToken': getCookie('csrftoken') // Add if you are using session auth instead of tokens
        },
        body: JSON.stringify({ nearby_places: places }),
      });

      if (response.ok) {
        setIsEditing(false);
      } else {
        console.error("Failed to save nearby places");
      }
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPlace = () => {
    setPlaces([...places, { name: "", type: "Activity", distance: "" }]);
  };

  const updatePlace = (index: number, field: keyof NearbyPlace, value: string) => {
    const newPlaces = [...places];
    newPlaces[index][field] = value;
    setPlaces(newPlaces);
  };

  const removePlace = (index: number) => {
    setPlaces(places.filter((_, i) => i !== index));
  };

  return (
    <section className="py-16 sm:py-20 bg-secondary/40">
      <div className="section-container">
        <h2 className="font-serif text-3xl sm:text-4xl text-foreground mb-2">
          Map & Surroundings
        </h2>
        <p className="text-muted-foreground mb-8 text-sm">
          Explore what's around — extracted from reel mentions
        </p>

        {/* Dynamic Map Embed (OpenStreetMap is free and requires no API key) */}
        <div className="relative w-full h-72 sm:h-96 rounded-2xl overflow-hidden bg-muted mb-10 shadow-inner border border-border">
          {latitude && longitude ? (
            <iframe
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              marginHeight={0}
              marginWidth={0}
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01}%2C${lat - 0.01}%2C${lng + 0.01}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lng}`}
              style={{ filter: "contrast(0.9) opacity(0.9)" }} // slight styling to match vibes
            ></iframe>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center flex-col gap-3">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="w-7 h-7 text-primary" />
              </div>
              <span className="text-muted-foreground text-sm font-medium">
                No coordinates found for this location
              </span>
            </div>
          )}
        </div>

        {/* Nearby Places Section */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            Mentioned Nearby
          </h3>
          <button
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            disabled={isSaving}
            className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            {isEditing ? (
              <>{isSaving ? "Saving..." : <><Check className="w-4 h-4" /> Save Edits</>}</>
            ) : (
              <><Edit2 className="w-4 h-4" /> Edit List</>
            )}
          </button>
        </div>

        {isEditing ? (
          <div className="flex flex-col gap-3 bg-background p-4 rounded-xl border border-border">
            {places.map((place, i) => (
              <div key={i} className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                <input
                  type="text"
                  placeholder="Name (e.g. Cafe Lito)"
                  value={place.name}
                  onChange={(e) => updatePlace(i, 'name', e.target.value)}
                  className="flex-1 bg-muted p-2 rounded-md text-sm border-none focus:ring-1 outline-none"
                />
                <input
                  type="text"
                  placeholder="Type (e.g. Café)"
                  value={place.type}
                  onChange={(e) => updatePlace(i, 'type', e.target.value)}
                  className="w-full sm:w-1/4 bg-muted p-2 rounded-md text-sm border-none focus:ring-1 outline-none"
                />
                <input
                  type="text"
                  placeholder="Distance (e.g. 5 min walk)"
                  value={place.distance}
                  onChange={(e) => updatePlace(i, 'distance', e.target.value)}
                  className="w-full sm:w-1/4 bg-muted p-2 rounded-md text-sm border-none focus:ring-1 outline-none"
                />
                <button onClick={() => removePlace(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-md">
                  <Trash className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              onClick={handleAddPlace}
              className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground p-3 border border-dashed rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Place from Reel
            </button>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
            {places.length > 0 ? (
              places.map((place, i) => {
                const Icon = getIconForType(place.type);
                return (
                  <div key={i} className="nearby-card flex-shrink-0 w-48 bg-background border border-border rounded-xl">
                    <div className="p-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <h4 className="text-sm font-semibold text-foreground mb-1 truncate">
                        {place.name}
                      </h4>
                      <p className="text-xs text-muted-foreground truncate">
                        {place.type} {place.distance && `· ${place.distance}`}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="w-full p-6 text-center text-muted-foreground border border-dashed rounded-xl flex flex-col items-center">
                <Info className="w-6 h-6 mb-2 opacity-50" />
                <p className="text-sm">No nearby places added yet.</p>
                <p className="text-xs opacity-70 mt-1">Click "Edit List" to add spots mentioned in reels.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default MapSurroundings;
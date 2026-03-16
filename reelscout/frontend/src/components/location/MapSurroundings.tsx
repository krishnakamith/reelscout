import { useState, useEffect } from "react";
import { 
  MapPin, Coffee, ShoppingBag, Landmark, 
  UtensilsCrossed, Edit2, Check, Plus, Trash, Info 
} from "lucide-react";

// React-Leaflet imports
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for Leaflet's default marker icon paths in Vite/React
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

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
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync state if props load after initial render
  useEffect(() => {
    if (initialPlaces && initialPlaces.length > 0) {
      setPlaces(initialPlaces);
    }
  }, [initialPlaces]);

  // Fallback coordinates if none are provided
  const lat = latitude ? parseFloat(latitude) : 34.9949;
  const lng = longitude ? parseFloat(longitude) : 135.7850;
  
  // Coordinate tuple for Leaflet
  const position: [number, number] = [lat, lng];

  const handleSave = async () => {
    if (!locationSlug) return;
    setSaveError(null);
    setIsSaving(true);
    
    try {
      const payload = places
        .map((place) => ({
          name: place.name.trim(),
          type: place.type.trim(),
          distance: place.distance.trim(),
        }))
        .filter((place) => place.name.length > 0);

      const response = await fetch(`/api/locations/${encodeURIComponent(locationSlug)}/nearby-places/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nearby_places: payload }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        if (Array.isArray(data?.nearby_places)) {
          setPlaces(data.nearby_places as NearbyPlace[]);
        }
        setIsEditing(false);
      } else {
        throw new Error(data?.error || "Failed to save nearby places");
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save nearby places");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPlace = () => {
    setPlaces([...places, { name: "", type: "Hotel", distance: "" }]);
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
          Add and edit nearby places of interest like hotels, cafes, and landmarks.
        </p>

        {/* Interactive Leaflet Map */}
        <div className="relative w-full h-72 sm:h-96 rounded-2xl overflow-hidden bg-muted mb-10 shadow-inner border border-border z-0">
          {latitude && longitude ? (
            <MapContainer 
              center={position} 
              zoom={15} 
              scrollWheelZoom={false} 
              className="w-full h-full"
              style={{ zIndex: 10 }} // Ensure it stays behind fixed UI elements like sidebars
            >
              <TileLayer
                attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />
              <Marker position={position}>
                <Popup className="font-sans">
                  <span className="font-semibold text-sm">
                    {locationSlug ? locationSlug.replace(/-/g, ' ').toUpperCase() : 'Main Destination'}
                  </span>
                </Popup>
              </Marker>
            </MapContainer>
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
                  placeholder="Type (e.g. Hotel)"
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
              <Plus className="w-4 h-4" /> Add Place of Interest
            </button>
            {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}
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


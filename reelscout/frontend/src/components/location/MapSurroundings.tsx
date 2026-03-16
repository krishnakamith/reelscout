import { useEffect, useMemo, useState } from "react";
import { 
  MapPin, Coffee, ShoppingBag, Landmark, 
  UtensilsCrossed, Edit2, Check, Plus, Trash, Info 
} from "lucide-react";

// React-Leaflet imports
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Helper to pick icons dynamically based on the place "type"
const getIconForType = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes("caf") || t.includes("coffee") || t.includes("juice")) return Coffee;
  if (t.includes("shop") || t.includes("souvenir") || t.includes("store")) return ShoppingBag;
  if (t.includes("restaurant") || t.includes("food") || t.includes("eat")) return UtensilsCrossed;
  return Landmark; // Default icon
};

type PinType = "origin" | "hotel" | "activity" | "toilet" | "food" | "shopping" | "transport" | "other";

const PIN_META: Record<PinType, { label: string; color: string; glyph: string }> = {
  origin: { label: "Main Location", color: "#dc2626", glyph: "M" },
  hotel: { label: "Hotel / Stay", color: "#2563eb", glyph: "H" },
  activity: { label: "Activity Spot", color: "#16a34a", glyph: "A" },
  toilet: { label: "Toilet", color: "#a21caf", glyph: "T" },
  food: { label: "Food / Cafe", color: "#ea580c", glyph: "F" },
  shopping: { label: "Shop / Market", color: "#ca8a04", glyph: "S" },
  transport: { label: "Transit / Parking", color: "#0f766e", glyph: "R" },
  other: { label: "Other", color: "#475569", glyph: "O" },
};

const LEGEND_TYPES: PinType[] = [
  "origin",
  "hotel",
  "activity",
  "toilet",
  "food",
  "shopping",
  "transport",
  "other",
];

const PIN_TYPE_OPTIONS = [
  "Hotel",
  "Activity",
  "Toilet",
  "Food / Cafe",
  "Shopping",
  "Transport",
  "Other",
];

const resolvePinType = (rawType: string): PinType => {
  const typeText = String(rawType || "").trim().toLowerCase();

  if (!typeText) return "other";

  if (
    typeText.includes("hotel")
    || typeText.includes("resort")
    || typeText.includes("lodge")
    || typeText.includes("homestay")
    || typeText.includes("stay")
    || typeText.includes("hostel")
  ) return "hotel";

  if (
    typeText.includes("toilet")
    || typeText.includes("restroom")
    || typeText.includes("washroom")
    || typeText.includes("bathroom")
    || typeText === "wc"
  ) return "toilet";

  if (
    typeText.includes("cafe")
    || typeText.includes("coffee")
    || typeText.includes("restaurant")
    || typeText.includes("food")
    || typeText.includes("eat")
    || typeText.includes("tea")
  ) return "food";

  if (
    typeText.includes("shop")
    || typeText.includes("store")
    || typeText.includes("souvenir")
    || typeText.includes("market")
  ) return "shopping";

  if (
    typeText.includes("bus")
    || typeText.includes("station")
    || typeText.includes("parking")
    || typeText.includes("taxi")
    || typeText.includes("metro")
  ) return "transport";

  if (
    typeText.includes("activity")
    || typeText.includes("adventure")
    || typeText.includes("trek")
    || typeText.includes("trail")
    || typeText.includes("view")
    || typeText.includes("park")
    || typeText.includes("beach")
    || typeText.includes("waterfall")
  ) return "activity";

  return "other";
};

const createPinIcon = (pinType: PinType) => {
  const meta = PIN_META[pinType];

  return L.divIcon({
    className: "",
    html: `
      <div style="position: relative; width: 28px; height: 36px; display: flex; align-items: flex-start; justify-content: center;">
        <div style="width: 22px; height: 22px; border-radius: 9999px; background: ${meta.color}; border: 2px solid #ffffff; color: #ffffff; font-size: 10px; font-weight: 700; line-height: 1; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.35);">
          ${meta.glyph}
        </div>
        <div style="position: absolute; top: 18px; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 12px solid ${meta.color}; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.25));"></div>
      </div>
    `,
    iconSize: [28, 36],
    iconAnchor: [14, 34],
    popupAnchor: [0, -28],
  });
};

interface NearbyPlace {
  name: string;
  type: string;
  distance: string;
  lat?: number | string;
  lng?: number | string;
}

interface MapSurroundingsProps {
  locationSlug?: string;
  latitude?: string | null;
  longitude?: string | null;
  initialPlaces?: NearbyPlace[];
}

// Component to handle map clicks for adding new pins
function MapClickHandler({ isEditing, onMapClick }: { isEditing: boolean, onMapClick: (latlng: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      if (isEditing) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
}

const MapSurroundings = ({ locationSlug, latitude, longitude, initialPlaces = [] }: MapSurroundingsProps) => {
  const [places, setPlaces] = useState<NearbyPlace[]>(initialPlaces);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // BUGFIX: Stringify the props so we don't accidentally overwrite our new pins 
  // with stale data if the parent component re-renders before refetching from Django!
  const initialPlacesStr = JSON.stringify(initialPlaces);
  useEffect(() => {
    const parsedPlaces = JSON.parse(initialPlacesStr);
    if (Array.isArray(parsedPlaces) && parsedPlaces.length > 0) {
      setPlaces(parsedPlaces);
    }
  }, [initialPlacesStr]);

  // Fallback coordinates if none are provided
  const lat = latitude ? parseFloat(latitude) : 34.9949;
  const lng = longitude ? parseFloat(longitude) : 135.7850;
  
  // Coordinate tuple for Leaflet
  const position: [number, number] = [lat, lng];
  const markerIcons = useMemo<Record<PinType, L.DivIcon>>(
    () => ({
      origin: createPinIcon("origin"),
      hotel: createPinIcon("hotel"),
      activity: createPinIcon("activity"),
      toilet: createPinIcon("toilet"),
      food: createPinIcon("food"),
      shopping: createPinIcon("shopping"),
      transport: createPinIcon("transport"),
      other: createPinIcon("other"),
    }),
    []
  );

  const handleSave = async () => {
    if (!locationSlug) return;

    // GUARD: Prevent saving if any place has an empty name
    if (places.some((place) => place.name.trim() === "")) {
      setSaveError("You have an unnamed pin. Please give it a name or delete it before saving.");
      return;
    }

    setSaveError(null);
    setIsSaving(true);
    
    try {
      // Ensure lat/lng are cast as floats so Django saves them as numbers, not strings
      const payload = places.map((place) => ({
        name: place.name.trim(),
        type: place.type.trim(),
        distance: place.distance.trim(),
        lat: place.lat ? parseFloat(place.lat.toString()) : undefined,
        lng: place.lng ? parseFloat(place.lng.toString()) : undefined
      }));

      const response = await fetch(`/api/locations/${encodeURIComponent(locationSlug)}/nearby-places/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nearby_places: payload }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        // Double check we actually got an array back before replacing our local state
        if (data && Array.isArray(data.nearby_places)) {
          setPlaces(data.nearby_places as NearbyPlace[]);
        } else if (Array.isArray(data)) {
          setPlaces(data as NearbyPlace[]);
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
    // GUARD: Prevent adding a new row if an existing one is empty
    if (places.some((place) => place.name.trim() === "")) {
      setSaveError("Please complete or delete the empty entry before adding a new one.");
      return;
    }
    setSaveError(null);
    setPlaces([...places, { name: "", type: "Hotel", distance: "" }]);
  };

  const handleMapClick = (latlng: L.LatLng) => {
    // GUARD: Prevent dropping multiple pins without naming them first
    if (places.some((place) => place.name.trim() === "")) {
      setSaveError("Please name your recently dropped pin (or delete it) before adding another.");
      return;
    }
    setSaveError(null);
    setPlaces([
      ...places,
      { name: "", type: "Attraction", distance: "Just mapped", lat: latlng.lat, lng: latlng.lng }
    ]);
  };

  const updatePlace = (index: number, field: keyof NearbyPlace, value: string | number) => {
    // Clear error as soon as they start typing
    if (field === 'name') setSaveError(null);
    
    const newPlaces = [...places];
    newPlaces[index] = { ...newPlaces[index], [field]: value };
    setPlaces(newPlaces);
  };

  const removePlace = (index: number) => {
    setSaveError(null); // Clear errors if they delete the offending row
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
          {isEditing && <span className="ml-2 text-primary font-medium animate-pulse">Click anywhere on the map to drop a new pin!</span>}
        </p>

        <div className="mb-4 rounded-xl border border-border bg-background/70 px-3 py-2">
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
            {LEGEND_TYPES.map((pinType) => {
              const meta = PIN_META[pinType];
              return (
                <div key={pinType} className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-2.5 py-1 text-xs text-foreground">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: meta.color }}
                  />
                  <span>{meta.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Interactive Leaflet Map */}
        <div className={`relative w-full h-72 sm:h-96 rounded-2xl overflow-hidden bg-muted mb-10 shadow-inner border border-border z-0 ${isEditing ? 'cursor-crosshair ring-2 ring-primary/50' : ''}`}>
          {latitude && longitude ? (
            <MapContainer 
              center={position} 
              zoom={15} 
              scrollWheelZoom={false} 
              className="w-full h-full z-0"
              style={{ zIndex: 10 }}
            >
              <TileLayer
                attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />
              
              {/* Main Destination Marker */}
              <Marker position={position} icon={markerIcons.origin}>
                <Popup className="font-sans">
                  <span className="font-semibold text-sm">
                    {locationSlug ? locationSlug.replace(/-/g, ' ').toUpperCase() : 'Main Destination'}
                  </span>
                </Popup>
              </Marker>

              {/* Render all Nearby Places that have coordinates */}
              {places.map((place, i) => {
                // BUGFIX: Strictly parse floats so Leaflet doesn't crash if Django returns strings
                const pLat = place.lat ? parseFloat(place.lat.toString()) : NaN;
                const pLng = place.lng ? parseFloat(place.lng.toString()) : NaN;
                const pinType = resolvePinType(place.type);

                if (!isNaN(pLat) && !isNaN(pLng)) {
                  return (
                    <Marker key={i} position={[pLat, pLng]} icon={markerIcons[pinType]}>
                      <Popup className="font-sans">
                        <span className="font-semibold text-sm">{place.name || "New Place"}</span>
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {PIN_META[pinType].label}
                          {place.type ? ` (${place.type})` : ""}
                        </span>
                      </Popup>
                    </Marker>
                  );
                }
                return null;
              })}

              {/* Invisible component to listen for clicks when editing */}
              <MapClickHandler isEditing={isEditing} onMapClick={handleMapClick} />
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
              <div key={i} className={`flex flex-col gap-2 p-3 bg-muted rounded-md transition-colors ${place.name.trim() === "" && saveError ? "border-2 border-destructive/50 bg-destructive/5" : "border border-border"}`}>
                <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                  <input
                    type="text"
                    placeholder="Name (e.g. Cafe Lito) *"
                    value={place.name}
                    onChange={(e) => updatePlace(i, 'name', e.target.value)}
                    className={`flex-1 p-2 rounded-md text-sm outline-none focus:ring-2 ${place.name.trim() === "" && saveError ? "bg-background border border-destructive focus:ring-destructive/30" : "bg-background border-none focus:ring-primary/30"}`}
                  />
                  <select
                    value={place.type || "Hotel"}
                    onChange={(e) => updatePlace(i, 'type', e.target.value)}
                    className="w-full sm:w-1/4 bg-background p-2 rounded-md text-sm border-none focus:ring-2 focus:ring-primary/30 outline-none"
                  >
                    {PIN_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Any remarks"
                    value={place.distance}
                    onChange={(e) => updatePlace(i, 'distance', e.target.value)}
                    className="w-full sm:w-1/4 bg-background p-2 rounded-md text-sm border-none focus:ring-2 focus:ring-primary/30 outline-none"
                  />
                  <button onClick={() => removePlace(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors">
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
                {/* Visual indicator of map placement */}
                <div className="text-xs text-muted-foreground flex items-center gap-1 pl-1">
                  <MapPin className="w-3 h-3" />
                  {place.lat && place.lng 
                    ? <span className="text-primary font-medium">Pinned on map</span> 
                    : "No map pin (Click the map to drop a pin for this place)"}
                </div>
              </div>
            ))}
            
            {saveError && (
              <div className="text-sm font-medium text-destructive mt-1 flex items-center gap-2">
                <Info className="w-4 h-4" /> {saveError}
              </div>
            )}

            <button
              onClick={handleAddPlace}
              className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground p-3 border border-dashed rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Place Manually
            </button>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
            {places.length > 0 ? (
              places.map((place, i) => {
                const Icon = getIconForType(place.type);
                return (
                  <div key={i} className="nearby-card flex-shrink-0 w-64 bg-background border border-border rounded-xl">
                    <div className="p-5">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <h4 className="text-sm font-semibold text-foreground mb-1 whitespace-normal break-words">
                        {place.name}
                      </h4>
                      <p className="text-xs text-muted-foreground whitespace-normal break-words leading-relaxed">
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

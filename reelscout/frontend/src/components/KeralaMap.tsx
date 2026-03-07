import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, GeoJSON, Marker, Tooltip as LeafletTooltip } from "react-leaflet";
import { divIcon } from "leaflet";
// Essential CSS for the map to render correctly
import "leaflet/dist/leaflet.css";

// Describe the shape of the data coming from your Django API
interface LocationData {
  id: number;
  name: string;
  slug: string;
  latitude: string;
  longitude: string;
  reels: any[];
}

export function KeralaMap() {
  const navigate = useNavigate();
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [geoData, setGeoData] = useState(null);
  const keralaBounds: [[number, number], [number, number]] = [
    [8.30, 75.05],   // south-west Kerala (tighter)
    [12.70, 77.15],  // north-east Kerala (tighter)
  ];

  useEffect(() => {
    // 1. Fetch live locations from your Django backend
    fetch("http://127.0.0.1:8000/api/locations/")
      .then((res) => res.json())
      .then((data) => {
         // Filter out any locations that haven't had coordinates added yet
         const validLocations = data.filter((loc: LocationData) => loc.latitude && loc.longitude);
         setLocations(validLocations);
      })
      .catch((err) => console.error("Error fetching locations:", err));

    // 2. Fetch the GeoJSON borders from your public folder
    fetch("/kerala-districts.json")
      .then((res) => res.json())
      .then((data) => setGeoData(data))
      .catch((err) => console.error("Error fetching GeoJSON:", err));
  }, []);

  // Recreate your pulsing Lucide pin using raw HTML and Tailwind classes
  const createCustomIcon = () => {
    return divIcon({
      className: "bg-transparent border-none", // Remove default leaflet marker styling
      html: `
        <div class="relative group cursor-pointer w-6 h-6 -ml-3 -mt-6">
          <div class="absolute inset-0 rounded-full bg-secondary/50 animate-ping opacity-75"></div>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="relative z-10 text-primary-foreground fill-kerala-terracotta hover:fill-secondary transition-colors duration-300">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      `,
    });
  };

  return (
    <div className="relative w-full max-w-6xl mx-auto h-[90vh] min-h-[800px] rounded-2xl overflow-hidden shadow-2xl border-4 border-muted">
      <MapContainer
        bounds={keralaBounds}
        boundsOptions={{ padding: [8, 8] }}
        scrollWheelZoom={false}
        minZoom={7.5}
        zoomSnap={0.25}
        zoomDelta={0.25}
        maxBounds={keralaBounds}
        maxBoundsViscosity={1.0}
        className="w-full h-full z-0"
      >
        {/* A clean, minimalist basemap to make your pins and borders pop */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {/* Draw the district borders if the file loaded successfully */}
        {geoData && (
          <GeoJSON
            data={geoData}
            style={{
              fillColor: "#4ade80", // Adjust to match your specific kerala-green hex
              weight: 2,
              color: "white",
              fillOpacity: 0.15
            }}
          />
        )}

        {/* Loop through your Django database locations and drop a pin for each */}
        {locations.map((location) => (
          <Marker
            key={location.id}
            position={[parseFloat(location.latitude), parseFloat(location.longitude)]}
            icon={createCustomIcon()}
            eventHandlers={{
              // Route to your existing detail page using the slug from the API
              click: () => navigate(`/location/${location.slug}`),
            }}
          >
            {/* Built-in Leaflet tooltip replacing the Shadcn one for compatibility */}
            <LeafletTooltip direction="top" offset={[0, -20]} className="border-0 shadow-lg rounded-lg p-3">
              <div className="text-center">
                <p className="font-bold text-gray-900">{location.name}</p>
                <p className="text-xs text-orange-600 font-medium mt-1">
                  {location.reels?.length || 0} reels discovered
                </p>
              </div>
            </LeafletTooltip>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

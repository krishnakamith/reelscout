import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GeoJSON, MapContainer, Marker, TileLayer, Tooltip as LeafletTooltip, useMap } from "react-leaflet";
import { divIcon, geoJSON, type LatLngBoundsExpression } from "leaflet";
import type { FeatureCollection, Geometry } from "geojson";
// Essential CSS for the map to render correctly
import "leaflet/dist/leaflet.css";

// Describe the shape of the data coming from your Django API
interface LocationData {
  id: number;
  name: string;
  slug: string;
  district?: string;
  latitude: string;
  longitude: string;
  reels?: Array<{ short_code?: string }>;
}

interface DistrictProperties {
  DISTRICT?: string;
}

function MapBoundsUpdater({ targetBounds }: { targetBounds: LatLngBoundsExpression | null }) {
  const map = useMap();

  useEffect(() => {
    if (!targetBounds) return;
    map.fitBounds(targetBounds, { padding: [24, 24], maxZoom: 10 });
  }, [map, targetBounds]);

  return null;
}

export function KeralaMap() {
  const navigate = useNavigate();
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [geoData, setGeoData] = useState<FeatureCollection<Geometry, DistrictProperties> | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [targetBounds, setTargetBounds] = useState<LatLngBoundsExpression | null>(null);

  const keralaBounds: [[number, number], [number, number]] = [
    [8.30, 75.05],   // south-west Kerala (tighter)
    [12.70, 77.15],  // north-east Kerala (tighter)
  ];

  const districtOptions = useMemo(() => {
    if (!geoData?.features) return [];

    const uniqueDistricts = new Set<string>();
    geoData.features.forEach((feature) => {
      const districtName = String(feature?.properties?.DISTRICT ?? "").trim();
      if (districtName) uniqueDistricts.add(districtName);
    });

    return Array.from(uniqueDistricts).sort((a, b) => a.localeCompare(b));
  }, [geoData]);

  useEffect(() => {
    // 1. Fetch live locations from your Django backend
    fetch("/api/locations/")
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

  const handleApplyDistrict = () => {
    if (!selectedDistrict || !geoData) {
      setTargetBounds(keralaBounds);
      return;
    }

    const districtFeature = geoData.features.find(
      (feature) => String(feature?.properties?.DISTRICT ?? "").trim() === selectedDistrict
    );

    if (!districtFeature) return;

    const bounds = geoJSON(districtFeature).getBounds();
    if (!bounds.isValid()) return;

    setTargetBounds(bounds);
  };

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
    <div className="space-y-4">
      <div className="mx-auto w-full max-w-6xl rounded-xl border border-border bg-background/70 p-4">
        <p className="mb-3 text-sm font-semibold text-foreground">Select District</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={selectedDistrict}
            onChange={(event) => setSelectedDistrict(event.target.value)}
            className="h-10 min-w-[220px] rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">All Kerala</option>
            {districtOptions.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleApplyDistrict}
            className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Apply
          </button>
        </div>
      </div>

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
          <MapBoundsUpdater targetBounds={targetBounds} />

          {/* A clean, minimalist basemap to make your pins and borders pop */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap contributors'
          />

          {/* Draw the district borders if the file loaded successfully */}
          {geoData && (
            <GeoJSON
              data={geoData}
              style={(feature) => {
                const districtName = String(feature?.properties?.DISTRICT ?? "").trim();
                const isSelected = selectedDistrict !== "" && districtName === selectedDistrict;

                return {
                  fillColor: isSelected ? "#f97316" : "#4ade80",
                  weight: isSelected ? 3 : 2,
                  color: isSelected ? "#fb923c" : "white",
                  fillOpacity: isSelected ? 0.3 : 0.15,
                };
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
    </div>
  );
}

import { createElement, useEffect, useMemo, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useNavigate } from "react-router-dom";
import { GeoJSON, MapContainer, Marker, TileLayer, Tooltip as LeafletTooltip, useMap } from "react-leaflet";
import { divIcon, geoJSON, type DivIcon, type LatLngBoundsExpression } from "leaflet";
import type { FeatureCollection, Geometry } from "geojson";
import { MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";

interface LocationData {
  id: number;
  name: string;
  slug: string;
  category?: string | null;
  district?: string | null;
  latitude: string | number;
  longitude: string | number;
  reels?: Array<{ short_code?: string }>;
}

interface DistrictProperties {
  DISTRICT?: string;
}

const keralaBounds: [[number, number], [number, number]] = [
  [8.3, 75.05],
  [12.7, 77.15],
];

const normalizeText = (value?: string | null) => String(value ?? "").trim().toLowerCase();

function createTrackerPinIcon(): DivIcon {
  const pinSvg = renderToStaticMarkup(
    createElement(MapPin, {
      className:
        "h-6 w-6 transition-colors duration-300 text-primary-foreground fill-kerala-terracotta group-hover:text-primary-foreground group-hover:fill-kerala-terracotta",
      "aria-hidden": true,
    })
  );

  return divIcon({
    className: "bg-transparent border-none",
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    tooltipAnchor: [0, -20],
    html: `
      <div class="group relative -ml-3 -mt-6 h-6 w-6 cursor-pointer transition-all duration-300 scale-100 hover:scale-125 hover:z-10">
        <span class="pointer-events-none absolute inset-0 rounded-full bg-kerala-terracotta/55 opacity-0 transition-opacity duration-300 animate-none group-hover:opacity-100 group-hover:animate-ping"></span>
        <div class="relative z-10 drop-shadow-[0_3px_5px_rgba(0,0,0,0.35)] group-hover:animate-pulse-soft">
          ${pinSvg}
        </div>
      </div>
    `,
  });
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
  const [selectedCategory, setSelectedCategory] = useState("");
  const [targetBounds, setTargetBounds] = useState<LatLngBoundsExpression | null>(null);

  const districtOptions = useMemo(() => {
    if (!geoData?.features) return [];

    const uniqueDistricts = new Set<string>();
    geoData.features.forEach((feature) => {
      const districtName = String(feature?.properties?.DISTRICT ?? "").trim();
      if (districtName) uniqueDistricts.add(districtName);
    });

    return Array.from(uniqueDistricts).sort((a, b) => a.localeCompare(b));
  }, [geoData]);

  const categoryOptions = useMemo(() => {
    const uniqueCategories = new Map<string, string>();

    locations.forEach((location) => {
      const category = String(location.category ?? "").trim();
      if (!category) return;
      const categoryKey = normalizeText(category);
      if (!uniqueCategories.has(categoryKey)) uniqueCategories.set(categoryKey, category);
    });

    return Array.from(uniqueCategories.values()).sort((a, b) => a.localeCompare(b));
  }, [locations]);

  const defaultMarkerIcon = useMemo(() => createTrackerPinIcon(), []);

  const filteredLocations = useMemo(() => {
    return locations.filter((location) => {
      const districtMatches =
        selectedDistrict === "" || normalizeText(location.district) === normalizeText(selectedDistrict);
      const categoryMatches =
        selectedCategory === "" || normalizeText(location.category) === normalizeText(selectedCategory);

      return districtMatches && categoryMatches;
    });
  }, [locations, selectedDistrict, selectedCategory]);

  const filteredLocationBounds = useMemo<LatLngBoundsExpression | null>(() => {
    if (filteredLocations.length === 0) return null;

    let minLat = 90;
    let maxLat = -90;
    let minLng = 180;
    let maxLng = -180;

    filteredLocations.forEach((location) => {
      const lat = parseFloat(String(location.latitude));
      const lng = parseFloat(String(location.longitude));
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    });

    if (minLat > maxLat || minLng > maxLng) return null;

    if (minLat === maxLat && minLng === maxLng) {
      return [
        [minLat - 0.06, minLng - 0.06],
        [maxLat + 0.06, maxLng + 0.06],
      ];
    }

    return [
      [minLat, minLng],
      [maxLat, maxLng],
    ];
  }, [filteredLocations]);

  useEffect(() => {
    fetch("/api/locations/")
      .then((res) => res.json())
      .then((data: LocationData[]) => {
        if (!Array.isArray(data)) {
          setLocations([]);
          return;
        }

        const validLocations = data.filter((location) => {
          const lat = parseFloat(String(location.latitude));
          const lng = parseFloat(String(location.longitude));
          return Number.isFinite(lat) && Number.isFinite(lng);
        });

        setLocations(validLocations);
      })
      .catch((err) => console.error("Error fetching locations:", err));

    fetch("/kerala-districts.json")
      .then((res) => res.json())
      .then((data) => setGeoData(data))
      .catch((err) => console.error("Error fetching GeoJSON:", err));
  }, []);

  const handleApplyFilters = () => {
    if (selectedDistrict && geoData) {
      const districtFeature = geoData.features.find(
        (feature) => String(feature?.properties?.DISTRICT ?? "").trim() === selectedDistrict
      );

      if (districtFeature) {
        const districtBounds = geoJSON(districtFeature).getBounds();
        if (districtBounds.isValid()) {
          setTargetBounds(districtBounds);
          return;
        }
      }
    }

    setTargetBounds(filteredLocationBounds ?? keralaBounds);
  };

  return (
    <div className="space-y-4">
      <div className="mx-auto w-full max-w-6xl rounded-xl border border-border bg-background/70 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_auto] lg:items-end">
          <label className="flex flex-col gap-1.5 text-sm text-foreground">
            <span className="font-semibold">Select District</span>
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
          </label>

          <label className="flex flex-col gap-1.5 text-sm text-foreground">
            <span className="font-semibold">Category</span>
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="h-10 min-w-[220px] rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All Categories</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={handleApplyFilters}
            className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 lg:min-w-[120px]"
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

          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

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

          {filteredLocations.map((location) => {
            const lat = parseFloat(String(location.latitude));
            const lng = parseFloat(String(location.longitude));
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

            const categoryLabel = String(location.category ?? "").trim() || "Uncategorized";

            return (
              <Marker
                key={location.id}
                position={[lat, lng]}
                icon={defaultMarkerIcon}
                eventHandlers={{
                  click: () => navigate(`/location/${location.slug}`),
                }}
              >
                <LeafletTooltip direction="top" offset={[0, -20]} className="border-0 shadow-lg rounded-lg p-3">
                  <div className="text-center">
                    <p className="font-bold text-gray-900">{location.name}</p>
                    <p className="mt-1 text-xs font-medium text-orange-600">{categoryLabel}</p>
                    <p className="mt-1 text-xs text-slate-700">{location.reels?.length || 0} reels discovered</p>
                  </div>
                </LeafletTooltip>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}

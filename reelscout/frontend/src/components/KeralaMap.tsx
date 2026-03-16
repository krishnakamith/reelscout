import { createElement, useEffect, useMemo, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useNavigate } from "react-router-dom";
import { GeoJSON, MapContainer, Marker, TileLayer, Tooltip as LeafletTooltip, useMap } from "react-leaflet";
import { divIcon, geoJSON, type DivIcon, type LatLngBoundsExpression } from "leaflet";
import type { FeatureCollection, Geometry } from "geojson";
import type { LucideIcon } from "lucide-react";
import { Building2, Castle, Landmark, MapPin, Mountain, TreePalm, Trees, Waves } from "lucide-react";
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

type CategoryPinKey = "water" | "beach" | "sacred" | "heritage" | "mountain" | "nature" | "urban" | "default";

interface CategoryPinMeta {
  color: string;
  icon: LucideIcon;
}

const CATEGORY_PIN_META: Record<CategoryPinKey, CategoryPinMeta> = {
  water: { color: "#0ea5e9", icon: Waves },
  beach: { color: "#f59e0b", icon: TreePalm },
  sacred: { color: "#f97316", icon: Landmark },
  heritage: { color: "#b45309", icon: Castle },
  mountain: { color: "#16a34a", icon: Mountain },
  nature: { color: "#22c55e", icon: Trees },
  urban: { color: "#64748b", icon: Building2 },
  default: { color: "#dc2626", icon: MapPin },
};

const keralaBounds: [[number, number], [number, number]] = [
  [8.3, 75.05],
  [12.7, 77.15],
];

const normalizeText = (value?: string | null) => String(value ?? "").trim().toLowerCase();

function resolveCategoryPin(category?: string | null): CategoryPinKey {
  const categoryText = normalizeText(category);

  if (!categoryText) return "default";

  if (["beach", "coast", "shore", "seashore"].some((tag) => categoryText.includes(tag))) return "beach";

  if (["waterfall", "falls", "lake", "river", "dam", "water", "backwater"].some((tag) => categoryText.includes(tag))) {
    return "water";
  }

  if (["temple", "church", "mosque", "shrine", "sacred", "pilgrim"].some((tag) => categoryText.includes(tag))) {
    return "sacred";
  }

  if (["fort", "heritage", "historic", "cave", "ruins", "museum", "palace"].some((tag) => categoryText.includes(tag))) {
    return "heritage";
  }

  if (["hill", "mountain", "peak", "viewpoint", "view point"].some((tag) => categoryText.includes(tag))) {
    return "mountain";
  }

  if (["forest", "park", "wildlife", "sanctuary", "reserve"].some((tag) => categoryText.includes(tag))) {
    return "nature";
  }

  if (["city", "town", "street", "market", "urban"].some((tag) => categoryText.includes(tag))) {
    return "urban";
  }

  return "default";
}

function createCategoryIcon(pinKey: CategoryPinKey): DivIcon {
  const meta = CATEGORY_PIN_META[pinKey];
  const iconSvg = renderToStaticMarkup(
    createElement(meta.icon, {
      size: 14,
      strokeWidth: 2.4,
      color: meta.color,
      "aria-hidden": true,
    })
  );

  return divIcon({
    className: "bg-transparent border-none",
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    tooltipAnchor: [0, -32],
    html: `
      <div style="position: relative; width: 30px; height: 42px;">
        <svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M15 1.5C8.096 1.5 2.5 7.096 2.5 14c0 8.889 10.705 19.015 11.161 19.441a1.97 1.97 0 0 0 2.678 0C16.795 33.015 27.5 22.889 27.5 14 27.5 7.096 21.904 1.5 15 1.5Z" fill="${meta.color}" stroke="#ffffff" stroke-width="1.5"/>
          <circle cx="15" cy="14" r="7" fill="#ffffff"/>
        </svg>
        <div style="position: absolute; left: 50%; top: 14px; transform: translate(-50%, -50%); line-height: 0;">
          ${iconSvg}
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

  const markerIcons = useMemo<Record<CategoryPinKey, DivIcon>>(
    () => ({
      water: createCategoryIcon("water"),
      beach: createCategoryIcon("beach"),
      sacred: createCategoryIcon("sacred"),
      heritage: createCategoryIcon("heritage"),
      mountain: createCategoryIcon("mountain"),
      nature: createCategoryIcon("nature"),
      urban: createCategoryIcon("urban"),
      default: createCategoryIcon("default"),
    }),
    []
  );

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

            const pinKey = resolveCategoryPin(location.category);
            const categoryLabel = String(location.category ?? "").trim() || "Uncategorized";

            return (
              <Marker
                key={location.id}
                position={[lat, lng]}
                icon={markerIcons[pinKey]}
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

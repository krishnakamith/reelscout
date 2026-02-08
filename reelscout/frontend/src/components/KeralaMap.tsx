import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import keralaMapImage from "@/assets/kerala-map.jpg";

// Sample documented locations from "previous reels"
// Locations positioned to match the uploaded Kerala map image
const locations = [
  { id: "bekal", name: "Bekal Fort", x: 38, y: 8, district: "Kasaragod", reelCount: 32 },
  { id: "wayanad", name: "Wayanad Hills", x: 48, y: 14, district: "Wayanad", reelCount: 112 },
  { id: "kozhikode", name: "Kozhikode Beach", x: 35, y: 22, district: "Kozhikode", reelCount: 56 },
  { id: "athirappilly", name: "Athirappilly Falls", x: 50, y: 38, district: "Thrissur", reelCount: 24 },
  { id: "fort-kochi", name: "Fort Kochi", x: 42, y: 48, district: "Ernakulam", reelCount: 134 },
  { id: "munnar", name: "Munnar Tea Gardens", x: 58, y: 52, district: "Idukki", reelCount: 156 },
  { id: "kumarakom", name: "Kumarakom Bird Sanctuary", x: 50, y: 58, district: "Kottayam", reelCount: 41 },
  { id: "thekkady", name: "Thekkady Wildlife", x: 62, y: 62, district: "Idukki", reelCount: 78 },
  { id: "alleppey", name: "Alleppey Backwaters", x: 48, y: 65, district: "Alappuzha", reelCount: 89 },
  { id: "varkala", name: "Varkala Cliff", x: 55, y: 78, district: "Thiruvananthapuram", reelCount: 67 },
  { id: "kovalam", name: "Kovalam Beach", x: 58, y: 88, district: "Thiruvananthapuram", reelCount: 45 },
];

export function KeralaMap() {
  const navigate = useNavigate();
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);

  const handleLocationClick = (locationId: string) => {
    navigate(`/location/${locationId}`);
  };

  return (
    <div className="relative w-full max-w-xl mx-auto">
      {/* Kerala Map Image */}
      <img
        src={keralaMapImage}
        alt="Kerala Map"
        className="w-full h-auto rounded-2xl shadow-2xl"
        style={{ filter: "drop-shadow(0 20px 50px hsl(var(--kerala-green) / 0.3))" }}
      />

      {/* Location markers overlaid on the map */}
      <div className="absolute inset-0">
        {locations.map((location) => (
          <Tooltip key={location.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleLocationClick(location.id)}
                onMouseEnter={() => setHoveredLocation(location.id)}
                onMouseLeave={() => setHoveredLocation(null)}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 group ${
                  hoveredLocation === location.id ? "scale-125 z-10" : "scale-100"
                }`}
                style={{ left: `${location.x}%`, top: `${location.y}%` }}
              >
                <div className={`relative ${hoveredLocation === location.id ? "animate-pulse-soft" : ""}`}>
                  <MapPin
                    className={`w-6 h-6 transition-colors duration-300 ${
                      hoveredLocation === location.id
                        ? "text-secondary fill-secondary"
                        : "text-primary-foreground fill-kerala-terracotta"
                    }`}
                    style={{ filter: hoveredLocation === location.id ? "url(#glow)" : "none" }}
                  />
                  {/* Pulse ring effect */}
                  <span
                    className={`absolute inset-0 rounded-full bg-secondary/30 animate-ping ${
                      hoveredLocation === location.id ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </div>
              </button>
            </TooltipTrigger>
            <TooltipContent 
              side="top" 
              className="bg-card border-border shadow-md p-3 rounded-lg"
            >
              <div className="text-center">
                <p className="font-display font-semibold text-foreground">{location.name}</p>
                <p className="text-sm text-muted-foreground">{location.district}</p>
                <p className="text-xs text-secondary font-medium mt-1">
                  {location.reelCount} reels discovered
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

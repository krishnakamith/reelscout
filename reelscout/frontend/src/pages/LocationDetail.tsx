import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, MapPin, Clock, Star, Users, ExternalLink, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChatbotSidebar } from "@/components/ChatbotSidebar";

type StaticLocation = {
  name: string;
  district: string;
  description: string;
  bestTime: string;
  rating: number;
  reelCount: number;
  tags: string[];
  highlights: string[];
};

type ApiLocation = {
  id: number;
  name: string;
  slug: string;
  category?: string | null;
  description?: string | null;
  how_to_reach?: string | null;
  best_time_to_visit?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  reels: {
    short_code: string;
    thumbnail_url?: string | null;
    author_handle?: string | null;
  }[];
};

type UIReel = { id: string; thumbnail: string; creator: string };

const locationData: Record<string, StaticLocation> = {
  "athirappilly": {
    name: "Athirappilly Falls",
    district: "Thrissur",
    description: "Known as the 'Niagara of India', Athirappilly Falls is the largest waterfall in Kerala. The 80-feet high waterfall is a spectacular sight, especially during monsoon when the Chalakudy River is in full flow. The surrounding Sholayar forest range is home to diverse wildlife including the endangered Hornbill.",
    bestTime: "September to January",
    rating: 4.7,
    reelCount: 24,
    tags: ["Waterfall", "Nature", "Photography", "Monsoon", "Wildlife"],
    highlights: ["80ft cascading waterfall", "Elephant sightings", "Nearby Vazhachal Falls", "Bamboo forest trails"],
  },
  "munnar": {
    name: "Munnar Tea Gardens",
    district: "Idukki",
    description: "Munnar is a breathtaking hill station in the Western Ghats, famous for its sprawling tea plantations that carpet the hills in every shade of green. The misty mountains, cool climate, and pristine beauty make it one of Kerala's most beloved destinations.",
    bestTime: "September to March",
    rating: 4.8,
    reelCount: 156,
    tags: ["Hill Station", "Tea Gardens", "Trekking", "Romantic", "Photography"],
    highlights: ["Endless tea plantations", "Eravikulam National Park", "Neelakurinji blooms", "Top Station viewpoint"],
  },
  "alleppey": {
    name: "Alleppey Backwaters",
    district: "Alappuzha",
    description: "Alleppey, often called the 'Venice of the East', is famous for its network of serene backwaters, houseboats, and lush paddy fields. Cruise through the palm-fringed canals on a traditional kettuvallam (houseboat) for an unforgettable experience.",
    bestTime: "October to February",
    rating: 4.6,
    reelCount: 89,
    tags: ["Backwaters", "Houseboat", "Relaxation", "Village Life", "Sunset"],
    highlights: ["Houseboat cruise", "Punnamada Lake", "Snake boat races", "Traditional toddy shops"],
  },
};

// Default data for unknown locations
const defaultLocation = {
  name: "Hidden Gem",
  district: "Kerala",
  description: "This location has been discovered through community-submitted reels. Details are being verified and enriched by our AI and fellow travelers.",
  bestTime: "Year-round",
  rating: 4.5,
  reelCount: 10,
  tags: ["Undiscovered", "Nature", "Local Favorite"],
  highlights: ["Community discovered", "Off-beat destination", "Local experiences"],
};

export default function LocationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const [apiLocation, setApiLocation] = useState<ApiLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const submittedReel = (routeLocation.state as { submittedReel?: { shortCode?: string; reelUrl?: string } } | null)?.submittedReel;

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetch(`/api/locations/${id}/`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Location not found");
        }
        return res.json();
      })
      .then((data: ApiLocation) => setApiLocation(data))
      .catch(() => setApiLocation(null))
      .finally(() => setIsLoading(false));
  }, [id]);

  const fallbackLocation = useMemo(
    () =>
      locationData[id || ""] || {
        ...defaultLocation,
        name: id?.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) || "Unknown Location",
      },
    [id]
  );

  const location = useMemo(() => {
    if (!apiLocation) {
      return fallbackLocation;
    }

    return {
      name: apiLocation.name,
      district: apiLocation.category || "Kerala",
      description: apiLocation.description || defaultLocation.description,
      bestTime: apiLocation.best_time_to_visit || defaultLocation.bestTime,
      rating: 4.6,
      reelCount: apiLocation.reels?.length || 0,
      tags: [apiLocation.category || "Travel Spot", "Community Submitted"],
      highlights: [
        apiLocation.how_to_reach || "Directions and travel tips will appear here.",
        "Mapped from real user-submitted reels",
      ],
    };
  }, [apiLocation, fallbackLocation]);

  const reels: UIReel[] = useMemo(() => {
    const apiReels = (apiLocation?.reels || []).map((reel) => ({
      id: reel.short_code,
      thumbnail: reel.thumbnail_url || "/placeholder.svg",
      creator: reel.author_handle ? `@${reel.author_handle}` : "@reelscout_user",
    }));

    if (submittedReel?.shortCode) {
      return [
        {
          id: submittedReel.shortCode,
          thumbnail: "/placeholder.svg",
          creator: "@you",
        },
        ...apiReels,
      ];
    }

    return apiReels;
  }, [apiLocation, submittedReel]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Map
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-secondary" />
            {location.district}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero Section */}
        <div className="mb-8">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            {location.name}
          </h1>

          {isLoading && (
            <p className="text-sm text-muted-foreground mb-3">
              Loading location details...
            </p>
          )}
          
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center gap-1">
              <Star className="h-5 w-5 text-kerala-gold fill-kerala-gold" />
              <span className="font-semibold text-foreground">{location.rating}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{location.reelCount} reels</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Best: {location.bestTime}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {location.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                {tag}
              </Badge>
            ))}
          </div>

          <p className="text-lg text-muted-foreground leading-relaxed">
            {location.description}
          </p>
        </div>

        {/* Highlights */}
        <section className="mb-10">
          <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
            Highlights
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {location.highlights.map((highlight, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-accent flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-primary-foreground">
                    {index + 1}
                  </span>
                </div>
                <span className="text-foreground">{highlight}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Reels Section */}
        {reels.length > 0 && (
          <section className="mb-10">
            <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
              Discovered Reels
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {reels.map((reel) => (
                <div
                  key={reel.id}
                  className="group relative aspect-[9/16] rounded-xl bg-muted overflow-hidden cursor-pointer"
                >
                  <img
                    src={reel.thumbnail}
                    alt="Reel thumbnail"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-primary-foreground/20 backdrop-blur flex items-center justify-center">
                      <Play className="h-6 w-6 text-primary-foreground fill-primary-foreground" />
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-sm text-primary-foreground font-medium truncate">
                      {reel.creator}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Action Card */}
        <div className="p-6 rounded-2xl bg-gradient-hero text-primary-foreground">
          <h3 className="font-display text-xl font-semibold mb-2">
            Been here? Share your experience!
          </h3>
          <p className="opacity-80 mb-4">
            Help other travelers by contributing tips, photos, or your own reel about this place.
          </p>
          <Button
            onClick={() => navigate("/contribute")}
            className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Contribute Now
          </Button>
        </div>
      </main>

      <ChatbotSidebar />
    </div>
  );
}

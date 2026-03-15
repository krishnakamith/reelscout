import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MapPin, Plus, Sparkles, Film, Compass, MessageCircle, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KeralaMap } from "@/components/KeralaMap";
import { ChatbotSidebar } from "@/components/ChatbotSidebar";
import heroImage from "@/assets/kerala-hero.jpg";

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasAutoScrolledRef = useRef(false);
  const [locationsCount, setLocationsCount] = useState<number | null>(null);
  const [reelsCount, setReelsCount] = useState<number | null>(null);
  const [chatOpenTrigger, setChatOpenTrigger] = useState(0);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/locations/")
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch stats: ${res.status}`);
        return res.json();
      })
      .then((data: Array<{ id?: number; reels?: Array<{ short_code?: string }> }>) => {
        if (!isMounted || !Array.isArray(data)) return;

        const locationIds = new Set<number>();
        const reelShortCodes = new Set<string>();

        data.forEach((location) => {
          if (typeof location?.id === "number") {
            locationIds.add(location.id);
          }

          if (Array.isArray(location?.reels)) {
            location.reels.forEach((reel) => {
              if (typeof reel?.short_code === "string" && reel.short_code.trim()) {
                reelShortCodes.add(reel.short_code);
              }
            });
          }
        });

        setLocationsCount(locationIds.size);
        setReelsCount(reelShortCodes.size);
      })
      .catch(() => {
        if (!isMounted) return;
        setLocationsCount(0);
        setReelsCount(0);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useLayoutEffect(() => {
    const shouldScrollToMap = (location.state as { scrollToMap?: boolean } | null)?.scrollToMap === true;
    if (!shouldScrollToMap) {
      const previousScrollRestoration = window.history.scrollRestoration;
      window.history.scrollRestoration = "manual";
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      const timer = window.setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }, 0);
      return () => {
        window.clearTimeout(timer);
        window.history.scrollRestoration = previousScrollRestoration;
      };
    }
  }, []);

  useEffect(() => {
    const shouldScroll = (location.state as { scrollToMap?: boolean } | null)?.scrollToMap === true;

    if (!shouldScroll || hasAutoScrolledRef.current) return;

    hasAutoScrolledRef.current = true;
    setTimeout(() => {
      document.getElementById("map-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      navigate(location.pathname, { replace: true, state: null });
    }, 50);
  }, [location.state, location.pathname, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-hero flex items-center justify-center">
              <Compass className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl text-foreground">ReelScout</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setChatOpenTrigger((prev) => prev + 1)}
              className="gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              Chatbot
            </Button>
            <Button
              onClick={() => navigate("/contribute")}
              className="bg-gradient-accent text-primary-foreground hover:opacity-90 transition-opacity gap-2"
            >
              <Plus className="h-4 w-4" />
              Contribute Reel
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0 z-0">
            <img
              src={heroImage}
              alt="Kerala Backwaters"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
          </div>

          <div className="relative z-10 container mx-auto px-4 py-12 md:py-16">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-medium">AI-Powered Travel Discovery</span>
              </div>
              
              <h1 className="font-display text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
                Reel<span className="text-gradient-hero">Scout</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
                Discover Kerala's hidden gems through viral reels. 
                <span className="text-foreground font-medium"> Find your next adventure, </span>
                curated by AI and fellow travelers.
              </p>

              <div className="flex flex-wrap gap-4">
                <Button
                  onClick={() => navigate("/contribute")}
                  size="lg"
                  className="h-14 px-8 text-lg font-semibold bg-gradient-accent text-primary-foreground hover:opacity-90 transition-opacity shadow-lg gap-2"
                >
                  <Film className="h-5 w-5" />
                  Contribute Reel
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => document.getElementById('map-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="h-14 px-8 text-lg font-semibold border-primary/30 text-foreground hover:bg-primary/5 gap-2"
                >
                  <MapPin className="h-5 w-5" />
                  Explore Map
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-8 md:py-10 border-b border-border bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="-mt-[55px] relative overflow-hidden rounded-2xl bg-transparent px-6 py-7 md:px-10 md:py-9">
                <div className="absolute -top-14 -right-10 h-36 w-36 rounded-full bg-primary/10 blur-3xl" />
                <div className="absolute -bottom-16 -left-8 h-32 w-32 rounded-full bg-secondary/10 blur-3xl" />

                <div className="relative z-10 text-center">
                  <p className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wide text-primary mb-3">
                    HOW IT WORKS
                  </p>
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-left">
                    <div className="rounded-xl border border-orange-300/70 bg-orange-100/85 px-3 py-2 shadow-sm">
                      <p className="font-semibold text-orange-900">Contribute</p>
                      <p className="text-orange-800/90 mt-1">Submit reels to grow shared destination intel.</p>
                    </div>
                    <div className="rounded-xl border border-orange-300/70 bg-orange-100/85 px-3 py-2 shadow-sm">
                      <p className="font-semibold text-orange-900">Discover</p>
                      <p className="text-orange-800/90 mt-1">Find places through the chatbot or interactive map.</p>
                    </div>
                    <div className="rounded-xl border border-orange-300/70 bg-orange-100/85 px-3 py-2 shadow-sm">
                      <p className="font-semibold text-orange-900">Plan</p>
                      <p className="text-orange-800/90 mt-1">Use data to plan your trip.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-12 border-b border-border bg-card/50">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto text-center">
              <div>
                <p className="font-display text-3xl md:text-4xl font-bold text-gradient-hero">
                  {locationsCount === null ? "..." : locationsCount.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Locations Mapped</p>
              </div>
              <div>
                <p className="font-display text-3xl md:text-4xl font-bold text-gradient-hero">
                  {reelsCount === null ? "..." : reelsCount.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Reels Analyzed</p>
              </div>
              <div>
                <p className="font-display text-3xl md:text-4xl font-bold text-gradient-hero">AI</p>
                <p className="text-sm text-muted-foreground mt-1">Powered Discovery</p>
              </div>
            </div>
          </div>
        </section>

        {/* Map Section - Full Width */}
        <section id="map-section" className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
                Explore <span className="text-gradient-hero">Kerala</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Click on any marker to discover locations found in trending reels
              </p>
            </div>

            <div className="relative">
              {/* Decorative elements */}
              <div className="absolute -top-20 -left-20 w-60 h-60 bg-primary/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />
              <div className="absolute top-1/2 left-0 w-40 h-40 bg-kerala-water/10 rounded-full blur-3xl" />
              
              {/* Map Container */}
              <div className="relative bg-gradient-to-br from-card via-card to-muted/30 rounded-3xl border border-border shadow-xl p-6 md:p-10">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
                  <MapPin className="h-4 w-4 text-secondary" />
                  <span>Click on markers to view location details</span>
                </div>
                
                {/* Legend */}
                <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-kerala-terracotta" />
                    <span>Documented Locations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-1 bg-kerala-water/50 rounded" />
                    <span>Coastal Line</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-2 bg-primary/30 rounded" />
                    <span>Western Ghats</span>
                  </div>
                </div>
                
                <KeralaMap />
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-hero p-10 md:p-16 text-center">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary-foreground rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-primary-foreground rounded-full blur-3xl" />
              </div>
              
              <div className="relative z-10">
                <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                  Found a Hidden Gem?
                </h2>
                <p className="text-lg text-primary-foreground/80 max-w-xl mx-auto mb-8">
                  Help fellow travelers discover amazing places. Submit a reel and our AI will do the rest.
                </p>
                <Button
                  onClick={() => navigate("/contribute")}
                  size="lg"
                  className="h-14 px-10 text-lg font-semibold bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-lg gap-2"
                >
                  <Plus className="h-5 w-5" />
                  Contribute Now
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p className="text-sm inline-flex items-center justify-center gap-1">
            Made with
            <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500" />
            for travelers who seek hidden gems
          </p>
        </div>
      </footer>

      {/* Chatbot */}
      <ChatbotSidebar externalOpenTrigger={chatOpenTrigger} />
    </div>
  );
};

export default Index;



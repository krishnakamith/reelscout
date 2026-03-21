import { useEffect, useState, useRef } from "react";
import { MessageCircle, X, Maximize2, Minimize2, Send, Bot, User, MapPin, MapPinOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ReelResult {
  location?: string;
  district?: string;
  summary?: string;
  short_code?: string;
  lat?: number;
  lng?: number;
}

interface Message {
  id: string;
  content: string;
  sender: "user" | "bot";
  timestamp: Date;
  results?: ReelResult[];
}

const initialMessages: Message[] = [
  {
    id: "1",
    content:
      "Hello! I'm your ReelScout travel assistant. Ask me about hidden gems in Kerala, travel tips, or help finding destinations!",
    sender: "bot",
    timestamp: new Date(),
  },
];

interface ChatbotSidebarProps {
  externalOpenTrigger?: number;
  onLocationsDetected?: (locations: ReelResult[]) => void;
}

export function ChatbotSidebar({
  externalOpenTrigger,
  onLocationsDetected
}: ChatbotSidebarProps) {

  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- NEW: LOCATION STATE ---
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "granted" | "denied">("idle");

  useEffect(() => {
    if (externalOpenTrigger && externalOpenTrigger > 0) {
      setIsOpen(true);
    }
  }, [externalOpenTrigger]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  // --- NEW: PROMISE-BASED GEOLOCATION HELPER ---
  const getBrowserLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!("geolocation" in navigator)) {
        reject(new Error("Geolocation not supported by browser."));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 8000 } // Give them 8 seconds to click "Allow"
      );
    });
  };

  const handleSendMessage = async () => {
    const userMessage = inputValue.trim();
    if (!userMessage || loading) return;

    // 1. Add User Message to UI instantly
    const newUserMsg: Message = {
      id: Date.now().toString(),
      content: userMessage,
      sender: "user",
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, newUserMsg]);
    setInputValue("");
    setLoading(true);

    let currentLat = userLocation?.lat;
    let currentLng = userLocation?.lng;

    // 2. THE INTERCEPT: Check for spatial intent ("near me", "within 20 km", etc.)
    const spatialIntent = /(near me|nearby|close by|around me|within \d+\s?km)/i.test(userMessage);

    if (spatialIntent && !currentLat) {
      try {
        setLocationStatus("loading");
        
        // This pauses execution and triggers the browser's permission popup
        const coords = await getBrowserLocation(); 
        
        currentLat = coords.lat;
        currentLng = coords.lng;
        
        // Save it for future messages in this session
        setUserLocation(coords);
        setLocationStatus("granted");
        
      } catch (error) {
        console.warn("Location denied or timed out:", error);
        setLocationStatus("denied");
        // We will proceed anyway; the backend will just ignore distance sorting
      }
    }

    // 3. Prepare Chat History (formatting it for the backend RAG pipeline)
    const chatHistory = messages.map(m => `${m.sender === "user" ? "User" : "ReelScout"}: ${m.content}`);

    // 4. Send the payload to your Django API
    try {
      const response = await fetch('/api/chat/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          history: chatHistory,
          lat: currentLat, // <-- Inject Latitude
          lng: currentLng, // <-- Inject Longitude
        }),
      });

      const data = await response.json();
      
      const newBotMsg: Message = {
        id: (Date.now() + 1).toString(),
        content: data.answer || "I'm having trouble finding an answer right now.",
        sender: "bot",
        timestamp: new Date(),
        results: data.results || [],
      };

      setMessages((prev) => [...prev, newBotMsg]);

      // If the backend found locations and the parent component wants to know (e.g., to update the map)
      if (data.locations && data.locations.length > 0 && onLocationsDetected) {
         onLocationsDetected(data.locations);
      }

    } catch (error) {
      console.error("Chat API error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          content: "Sorry, I encountered a network error. Please try again.",
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // --- RENDER FLOATING BUTTON IF CLOSED ---
  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 z-50 transition-transform hover:scale-105"
        size="icon"
      >
        <MessageCircle className="h-6 w-6 text-primary-foreground" />
      </Button>
    );
  }

  // --- RENDER CHAT INTERFACE ---
  return (
    <div
      className={`fixed right-0 z-50 flex flex-col glass border-l border-border transition-all duration-300 ease-in-out shadow-2xl ${
        isMaximized
          ? "top-0 bottom-0 w-full sm:w-[450px]"
          : "bottom-6 sm:right-6 w-full sm:w-[400px] h-[80vh] sm:h-[600px] sm:rounded-2xl sm:border"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card sm:rounded-t-2xl">
        <div className="flex items-center gap-2">
          <div className="bg-primary/20 p-2 rounded-full">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">ReelScout Guide</h3>
            <p className="text-xs text-muted-foreground">Ask me about Kerala</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:text-foreground"
            onClick={() => setIsMaximized(!isMaximized)}
          >
            {isMaximized ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:text-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="flex flex-col gap-4 pb-4">
            
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${
                  msg.sender === "user" ? "ml-auto flex-row-reverse" : ""
                }`}
              >
                <div
                  className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center ${
                    msg.sender === "user"
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {msg.sender === "user" ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>

                <div className="flex flex-col gap-2 min-w-0">
                  <div
                    className={`p-3 rounded-2xl text-sm ${
                      msg.sender === "user"
                        ? "bg-secondary text-secondary-foreground rounded-tr-sm"
                        : "bg-muted text-foreground border border-border rounded-tl-sm"
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>

                  {/* Render Reel Results if the Bot returned any */}
                  {msg.results && msg.results.length > 0 && (
                    <div className="flex flex-col gap-2 mt-1">
                      {msg.results.map((place, idx) => (
                        <div
                          key={idx}
                          className="bg-card border border-border rounded-lg p-3 text-sm hover:border-primary/50 transition-colors"
                        >
                          <div className="font-medium text-foreground">
                            {place.location}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {place.district}
                          </div>
                          <p className="mt-1 text-xs line-clamp-2 text-muted-foreground">
                            {place.summary}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 max-w-[85%]">
                <div className="h-8 w-8 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-muted border border-border rounded-2xl rounded-tl-sm p-4 flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce"></span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Invisible div to scroll to bottom */}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t border-border bg-card sm:rounded-b-2xl">
          <div className="flex items-center gap-2 relative">
            
            {/* --- UI INDICATOR FOR LOCATION --- */}
            <div className="absolute left-3 flex items-center justify-center text-muted-foreground">
                {locationStatus === "idle" && <MapPin className="h-4 w-4 opacity-40" title="Location ready when needed" />}
                {locationStatus === "loading" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                {locationStatus === "granted" && <MapPin className="h-4 w-4 text-green-500" title="Location shared for nearby results" />}
                {locationStatus === "denied" && <MapPinOff className="h-4 w-4 text-destructive opacity-70" title="Location access denied" />}
            </div>

            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={loading}
              placeholder="Ask for nearby places, hidden gems..."
              className="flex-1 bg-background border-border focus-visible:ring-1 focus-visible:ring-primary pl-10 pr-4 py-6 rounded-xl"
            />

            <Button
              onClick={handleSendMessage}
              disabled={loading || !inputValue.trim()}
              className="bg-primary hover:bg-primary/90 h-12 w-12 shrink-0 rounded-xl shadow-sm transition-transform active:scale-95"
              size="icon"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
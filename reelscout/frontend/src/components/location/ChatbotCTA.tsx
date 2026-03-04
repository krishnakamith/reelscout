import { useState } from "react";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const ChatbotCTA = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      {/* CTA Banner */}
      <section className="py-16 sm:py-20">
        <div className="section-container">
          <div className="relative rounded-3xl overflow-hidden p-8 sm:p-12 lg:p-16 text-center animate-pulse-glow bg-foreground">
            <div
              className="absolute inset-0 opacity-[0.05]"
              style={{
                backgroundImage: "radial-gradient(circle at 30% 50%, hsl(var(--primary)) 0%, transparent 60%), radial-gradient(circle at 70% 50%, hsl(var(--accent)) 0%, transparent 60%)",
              }}
            />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl text-background mb-3">
                Need more details?
              </h2>
              <p className="text-background/60 mb-8 max-w-md mx-auto text-sm leading-relaxed">
                Ask our AI about this location — opening hours, hidden spots, travel routes, or anything you're curious about.
              </p>
              <Button
                onClick={() => setSidebarOpen(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-sm font-semibold rounded-full"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat with AI
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAB */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fab-button"
        aria-label="Open AI chat"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Chat Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-background shadow-2xl flex flex-col animate-slide-in-right">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">AI Explorer</h3>
                  <p className="text-xs text-muted-foreground">Ask about Kiyomizu-dera</p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-5 overflow-y-auto">
              <div className="bg-muted rounded-2xl rounded-tl-md p-4 mb-4 max-w-[85%]">
                <p className="text-sm text-foreground leading-relaxed">
                  Hi! I'm your AI travel guide for Kiyomizu-dera. Ask me anything — best photo spots, nearby restaurants, or how to avoid crowds. 🏯
                </p>
              </div>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-2 bg-muted rounded-xl px-4 py-3">
                <input
                  type="text"
                  placeholder="Ask about this location..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
                <button className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors">
                  <Send className="w-4 h-4 text-primary-foreground" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatbotCTA;

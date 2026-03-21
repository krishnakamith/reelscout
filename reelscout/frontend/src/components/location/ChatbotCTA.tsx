import { MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatbotCTAProps {
  onOpenChatbot?: () => void;
}

const ChatbotCTA = ({ onOpenChatbot }: ChatbotCTAProps) => {
  return (
    <section className="py-16 sm:py-20">
      <div className="section-container">
        <div className="relative rounded-3xl overflow-hidden p-8 sm:p-12 lg:p-16 text-center animate-pulse-glow bg-foreground">
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 30% 50%, hsl(var(--primary)) 0%, transparent 60%), radial-gradient(circle at 70% 50%, hsl(var(--accent)) 0%, transparent 60%)",
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
              Ask our AI about this location - opening hours, hidden spots, travel routes, or anything you&apos;re curious about.
            </p>
            <Button
              onClick={onOpenChatbot}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-sm font-semibold rounded-full"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Ask Chatbot
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ChatbotCTA;

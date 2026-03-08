import { useEffect, useState } from "react";
import { MessageCircle, X, Maximize2, Minimize2, Send, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  content: string;
  sender: "user" | "bot";
  timestamp: Date;
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
}

export function ChatbotSidebar({ externalOpenTrigger }: ChatbotSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof externalOpenTrigger === "number" && externalOpenTrigger > 0) {
      setIsOpen(true);
    }
  }, [externalOpenTrigger]);

  // Call Django RAG API
  async function askBackend(message: string) {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/chat/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();

      return data;
    } catch (error) {
      console.error("Chat API error:", error);
      return {
        answer: "Sorry, something went wrong contacting the server.",
      };
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    const query = inputValue;
    setInputValue("");
    setLoading(true);

    const result = await askBackend(query);

    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: result.answer || "I couldn't find anything.",
      sender: "bot",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, botMessage]);
    setLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-accent shadow-lg hover:shadow-xl transition-all duration-300 z-50"
        size="icon"
      >
        <MessageCircle className="h-6 w-6 text-primary-foreground" />
      </Button>
    );
  }

  return (
    <div
      className={`fixed z-50 transition-all duration-300 ease-out ${
        isMaximized
          ? "inset-4 md:inset-8"
          : "bottom-6 right-6 w-[380px] h-[500px]"
      }`}
    >
      <div className="flex flex-col h-full bg-card border border-border rounded-2xl shadow-lg overflow-hidden animate-scale-in">

        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-hero text-primary-foreground">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold">ReelScout Assistant</h3>
              <p className="text-xs opacity-80">Your travel guide to Kerala</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMaximized(!isMaximized)}
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
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
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.sender === "user" ? "flex-row-reverse" : ""
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.sender === "user"
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {message.sender === "user" ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>

                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    message.sender === "user"
                      ? "bg-secondary text-secondary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="text-sm text-muted-foreground">
                Assistant is thinking...
              </div>
            )}

          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border bg-background">
          <div className="flex gap-2">

            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask about Kerala destinations..."
              className="flex-1 bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary"
            />

            <Button
              onClick={handleSendMessage}
              className="bg-primary hover:bg-primary/90"
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>

          </div>
        </div>

      </div>
    </div>
  );
}
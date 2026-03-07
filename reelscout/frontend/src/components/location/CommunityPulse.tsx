import { FormEvent, useEffect, useMemo, useState } from "react";
import { Clock, MessageCircle, Send, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface CommunityPulseEntry {
  id: string;
  user: string;
  text: string;
  time: string;
  likes?: number;
  tag: string;
}

interface CommunityPulseProps {
  locationSlug?: string;
  initialEntries?: CommunityPulseEntry[];
}

const tagColors: Record<string, string> = {
  "Community Tip": "bg-primary/15 text-primary",
  "New Info": "bg-accent/15 text-accent",
  "Correction": "bg-primary/15 text-primary",
  "Route Tip": "bg-accent/15 text-accent",
};

function timeAgo(isoTime: string) {
  const date = new Date(isoTime);
  if (Number.isNaN(date.getTime())) return "Recently";
  const diff = Math.max(0, Date.now() - date.getTime());
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 60) return `${mins || 1} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function extractTagAndText(comment: string) {
  const match = /^\[([^\]]+)\]\s*(.*)$/.exec(comment.trim());
  if (!match) return { tag: "Community Tip", text: comment };
  return { tag: match[1] || "Community Tip", text: match[2] || "" };
}

const CommunityPulse = ({ locationSlug, initialEntries = [] }: CommunityPulseProps) => {
  const [entries, setEntries] = useState<CommunityPulseEntry[]>(initialEntries);
  const [name, setName] = useState("");
  const [tag, setTag] = useState("Community Tip");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEntries(initialEntries);
  }, [initialEntries]);

  const visibleEntries = useMemo(() => entries.slice(0, 12), [entries]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!locationSlug || !note.trim()) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/locations/${encodeURIComponent(locationSlug)}/notes/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          edited_by: name.trim() || "Anonymous",
          tag,
          note: note.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Unable to post your update right now.");
      }

      const revision = data?.revision;
      const parsed = extractTagAndText(String(revision?.comment || ""));
      const created: CommunityPulseEntry = {
        id: String(revision?.id || `${Date.now()}`),
        user: String(revision?.edited_by || name || "anonymous").replace(/\s+/g, ".").toLowerCase(),
        text: parsed.text || note.trim(),
        tag: parsed.tag || tag,
        time: timeAgo(String(revision?.created_at || new Date().toISOString())),
      };

      setEntries((prev) => [created, ...prev]);
      setNote("");
      if (!name.trim()) setName("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to submit update.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-16 sm:py-20">
      <div className="section-container">
        <div className="flex items-center gap-3 mb-2">
          <MessageCircle className="w-6 h-6 text-primary" />
          <h2 className="font-serif text-3xl sm:text-4xl text-foreground">Community Pulse</h2>
        </div>
        <p className="text-muted-foreground mb-8 text-sm">Add fresh tips, corrections, and local notes for this place.</p>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card/60 p-4 sm:p-5 mb-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name (optional)"
              className="bg-background border-border"
              maxLength={100}
            />
            <Input
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="Tag (e.g. Route Tip)"
              className="bg-background border-border"
              maxLength={40}
            />
            <Button type="submit" disabled={isSubmitting || !locationSlug || note.trim().length < 5} className="gap-2">
              <Send className="w-4 h-4" />
              {isSubmitting ? "Posting..." : "Post Update"}
            </Button>
          </div>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Share useful info (timings, access, parking, pricing, route warnings...)"
            className="bg-background border-border min-h-[100px]"
            maxLength={500}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </form>

        {visibleEntries.length === 0 ? (
          <div className="rounded-xl border border-border p-6 text-sm text-muted-foreground">
            No community updates yet. Be the first to add one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleEntries.map((comment, i) => (
              <div
                key={comment.id}
                className="comment-card opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${0.06 * i}s` }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-secondary-foreground flex-shrink-0">
                    {(comment.user?.[0] || "A").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">@{comment.user}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${tagColors[comment.tag] || "bg-primary/15 text-primary"}`}>
                        {comment.tag}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed mb-3">"{comment.text}"</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" /> {comment.likes ?? 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {comment.time}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default CommunityPulse;

import { MessageCircle, ThumbsUp, Clock } from "lucide-react";

const comments = [
  {
    user: "travel.with.yuki",
    avatar: "Y",
    text: "Park near the big cherry tree on the east side — saves you 10 minutes of walking uphill.",
    likes: 142,
    time: "3 days ago",
    tag: "Pro Tip",
  },
  {
    user: "kyoto.explorer",
    avatar: "K",
    text: "Go before 7 AM. By 9 it's already packed. The light at sunrise through the main hall is unreal.",
    likes: 89,
    time: "1 week ago",
    tag: "Timing",
  },
  {
    user: "wandering.lens",
    avatar: "W",
    text: "The Otowa Waterfall at the base has three streams — each grants a different wish. Don't drink from all three though, locals say that's greedy!",
    likes: 234,
    time: "2 weeks ago",
    tag: "Local Lore",
  },
  {
    user: "solo.adventures",
    avatar: "S",
    text: "Skip the main entrance souvenir shops. The ones on Sannen-zaka are way more authentic and cheaper.",
    likes: 67,
    time: "4 days ago",
    tag: "Savings",
  },
  {
    user: "ramen.and.ruins",
    avatar: "R",
    text: "Night illumination in November is absolutely magical. They only do it for a few weeks — check the dates!",
    likes: 312,
    time: "5 days ago",
    tag: "Must See",
  },
];

const tagColors: Record<string, string> = {
  "Pro Tip": "bg-primary/15 text-primary",
  "Timing": "bg-accent/15 text-accent",
  "Local Lore": "bg-primary/15 text-primary",
  "Savings": "bg-accent/15 text-accent",
  "Must See": "bg-primary/15 text-primary",
};

const CommunityPulse = () => {
  return (
    <section className="py-16 sm:py-20">
      <div className="section-container">
        <div className="flex items-center gap-3 mb-2">
          <MessageCircle className="w-6 h-6 text-primary" />
          <h2 className="font-serif text-3xl sm:text-4xl text-foreground">
            Community Pulse
          </h2>
        </div>
        <p className="text-muted-foreground mb-10 text-sm">
          Tips and comments extracted from reel discussions
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {comments.map((comment, i) => (
            <div
              key={i}
              className="comment-card opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${0.08 * i}s` }}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-secondary-foreground flex-shrink-0">
                  {comment.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">
                      @{comment.user}
                    </span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${tagColors[comment.tag]}`}>
                      {comment.tag}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed mb-3">
                    "{comment.text}"
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" /> {comment.likes}
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
      </div>
    </section>
  );
};

export default CommunityPulse;

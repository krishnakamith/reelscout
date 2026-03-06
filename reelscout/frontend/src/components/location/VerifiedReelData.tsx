import { CheckCircle, Plus } from "lucide-react";

interface ReelFact {
  id: string;
  category: string;
  fact: string;
  source?: string;
  verifiedCount?: number;
}

interface VerifiedReelDataProps {
  facts?: ReelFact[];
  reelCount?: number;
}

const defaultFacts: ReelFact[] = [
  { id: "1", category: "Entry Fee", fact: "¥400 for adults, ¥200 for children under 12. Cash only at the main gate.", verifiedCount: 12 },
  { id: "2", category: "Parking", fact: "Free lot on the east side off Route 143, ~50 spaces. Fills by 9 AM on weekends.", verifiedCount: 8 },
  { id: "3", category: "Hours", fact: "Open daily 6:00 AM – 6:00 PM. Extended to 9 PM during autumn illumination (mid-Nov).", verifiedCount: 15 },
  { id: "4", category: "Accessibility", fact: "Main path is wheelchair-accessible. Upper temple requires 142 stone steps, no ramp.", verifiedCount: 5 },
  { id: "5", category: "Photo Spot", fact: "Best angle from the wooden stage facing east. Arrive before 7 AM for no crowds.", verifiedCount: 22 },
  { id: "6", category: "Food", fact: "Matcha soft-serve stand at the south exit, ¥350. Closes at 5 PM.", verifiedCount: 9 },
  { id: "7", category: "Transit", fact: "Bus #206 from Kyoto Station, 15 min walk from Gojo-zaka stop.", verifiedCount: 18 },
  { id: "8", category: "Restrooms", fact: "Clean facilities near the main entrance and one midway up the trail.", verifiedCount: 6 },
];

const VerifiedReelData = ({ facts = defaultFacts, reelCount }: VerifiedReelDataProps) => {
  return (
    <section className="py-16 sm:py-20">
      <div className="section-container">
        <div className="flex items-center gap-3 mb-2">
          <CheckCircle className="w-6 h-6 text-accent" />
          <h2 className="font-serif text-3xl sm:text-4xl text-foreground">
            Verified Reel Data
          </h2>
        </div>
        <p className="text-muted-foreground mb-10 text-sm">
          Documented facts extracted and cross-verified from {reelCount ?? facts.length} community reels
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {facts.map((item, i) => (
            <div
              key={item.id}
              className="bento-card group opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${0.06 * i}s` }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                  {item.category}
                </span>
                {item.verifiedCount && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CheckCircle className="w-3 h-3 text-accent" />
                    {item.verifiedCount} reels
                  </span>
                )}
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                {item.fact}
              </p>
              {item.source && (
                <p className="text-xs text-muted-foreground mt-2">
                  Source: {item.source}
                </p>
              )}
            </div>
          ))}

          {/* Placeholder card hinting at expandability */}
          <div className="bento-card flex flex-col items-center justify-center text-center border-2 border-dashed border-border bg-transparent opacity-0 animate-fade-in-up"
            style={{ animationDelay: `${0.06 * facts.length}s` }}
          >
            <Plus className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              More facts added as new reels are processed
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VerifiedReelData;

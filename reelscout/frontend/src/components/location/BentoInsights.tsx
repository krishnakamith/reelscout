import { Sparkles, CircleDollarSign, Footprints, Clock, Eye, Calendar } from "lucide-react";

interface Insight {
  icon: React.ElementType;
  label: string;
  value: string;
  detail?: string;
  span?: string;
}

interface BentoInsightsProps {
  insights?: Insight[];
  extractedTips?: Record<string, string>;
  description?: string;
  bestTimeToVisit?: string;
}

const defaultInsights: Insight[] = [
  {
    icon: Eye,
    label: "Vibe",
    value: "Serene & spiritual",
    detail: "Surprisingly peaceful despite crowds if you go early",
    span: "col-span-1 sm:col-span-2",
  },
  {
    icon: CircleDollarSign,
    label: "Cost",
    value: "¥400",
    detail: "Cash only at the gate",
    span: "col-span-1",
  },
  {
    icon: Footprints,
    label: "Terrain",
    value: "Hilly, lots of steps",
    detail: "Wear comfortable shoes — steep stone paths",
    span: "col-span-1",
  },
  {
    icon: Sparkles,
    label: "Highlight",
    value: "Wooden stage overlook",
    detail: "The signature viewpoint featured in most reels",
    span: "col-span-1 sm:col-span-2",
  },
  {
    icon: Clock,
    label: "Duration",
    value: "2–3 hours",
    detail: "Including the surrounding walking trails",
    span: "col-span-1",
  },
  {
    icon: Calendar,
    label: "Best Season",
    value: "Late November",
    detail: "Foliage peaks around this time",
    span: "col-span-1",
  },
];

const fallbackIcons: React.ElementType[] = [
  Eye,
  CircleDollarSign,
  Footprints,
  Sparkles,
  Clock,
  Calendar,
];

function prettifyLabel(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

const BentoInsights = ({
  insights,
  extractedTips,
  description,
  bestTimeToVisit,
}: BentoInsightsProps) => {
  const derivedInsights: Insight[] = [];

  if (description?.trim()) {
    derivedInsights.push({
      icon: Eye,
      label: "Overview",
      value: description.trim(),
      span: "col-span-1 sm:col-span-2",
    });
  }

  if (bestTimeToVisit?.trim()) {
    derivedInsights.push({
      icon: Calendar,
      label: "Best Time",
      value: bestTimeToVisit.trim(),
      span: "col-span-1",
    });
  }

  if (extractedTips) {
    Object.entries(extractedTips)
      .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
      .slice(0, 6)
      .forEach(([key, value], index) => {
        derivedInsights.push({
          icon: fallbackIcons[index % fallbackIcons.length],
          label: prettifyLabel(key),
          value: value.trim(),
          span: index % 3 === 0 ? "col-span-1 sm:col-span-2" : "col-span-1",
        });
      });
  }

  const items = insights ?? (derivedInsights.length > 0 ? derivedInsights.slice(0, 6) : defaultInsights);

  return (
    <section className="py-16 sm:py-20">
      <div className="section-container">
        <h2 className="font-serif text-3xl sm:text-4xl text-foreground mb-2">
          Extracted Insights
        </h2>
        <p className="text-muted-foreground mb-10 text-sm">
          Curated from community reels and AI analysis
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {items.map((insight, i) => (
            <div
              key={i}
              className={`bento-card ${insight.span || "col-span-1"} opacity-0 animate-fade-in-up`}
              style={{ animationDelay: `${0.1 * i}s` }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <insight.icon className="w-4.5 h-4.5 text-primary" />
                </div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {insight.label}
                </span>
              </div>
              <p className="text-lg font-semibold text-foreground mb-1">
                {insight.value}
              </p>
              {insight.detail && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {insight.detail}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BentoInsights;

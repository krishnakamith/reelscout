import { Lightbulb, Star, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LocationData } from '@/types/location';

interface TipsSectionProps {
  location: LocationData;
}

export const TipsSection = ({ location }: TipsSectionProps) => {
  return (
    <section className="bg-sand px-6 py-16 md:px-12 lg:px-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-10 text-center font-serif text-3xl font-bold text-foreground md:text-4xl">
          Everything You Need to Know
        </h2>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Tips */}
          <Card className="border-0 shadow-card transition-shadow hover:shadow-card-lg">
            <CardHeader className="pb-4">
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10">
                <Lightbulb className="h-6 w-6 text-secondary" />
              </div>
              <CardTitle className="font-serif text-xl">Pro Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {location.tips.map((tip, index) => (
                  <li key={index} className="flex gap-3 text-sm text-muted-foreground">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-xs font-semibold text-secondary">
                      {index + 1}
                    </span>
                    {tip}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Highlights */}
          <Card className="border-0 shadow-card transition-shadow hover:shadow-card-lg">
            <CardHeader className="pb-4">
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gold/20">
                <Star className="h-6 w-6 text-gold" />
              </div>
              <CardTitle className="font-serif text-xl">Highlights</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {location.highlights.map((highlight, index) => (
                  <li key={index} className="flex gap-3 text-sm text-muted-foreground">
                    <Star className="h-4 w-4 shrink-0 fill-gold text-gold mt-0.5" />
                    {highlight}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Warnings */}
          <Card className="border-0 shadow-card transition-shadow hover:shadow-card-lg">
            <CardHeader className="pb-4">
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="font-serif text-xl">Good to Know</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {location.warnings.map((warning, index) => (
                  <li key={index} className="flex gap-3 text-sm text-muted-foreground">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                    {warning}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

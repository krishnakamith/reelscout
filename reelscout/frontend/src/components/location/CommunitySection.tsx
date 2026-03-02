import { ThumbsUp, BadgeCheck, MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LocationData } from '@/types/location';

interface CommunitySectionProps {
  location: LocationData;
}

export const CommunitySection = ({ location }: CommunitySectionProps) => {
  return (
    <section className="bg-sand px-6 py-16 md:px-12 lg:px-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
              Community Insights
            </h2>
            <p className="mt-2 text-muted-foreground">
              Real tips from travelers who've been here
            </p>
          </div>
          <Button className="gap-2">
            <MessageSquarePlus className="h-4 w-4" />
            Share Your Experience
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {location.communityInsights.map((insight, index) => (
            <Card 
              key={insight.id} 
              className="border-0 shadow-card transition-all hover:shadow-card-lg animate-fade-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {insight.author.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {insight.author}
                      </span>
                      {insight.verified && (
                        <BadgeCheck className="h-4 w-4 text-secondary" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(insight.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>

                <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                  {insight.content}
                </p>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <button className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 transition-colors hover:bg-muted/80">
                    <ThumbsUp className="h-3.5 w-3.5" />
                    <span>Helpful ({insight.helpful})</span>
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

import { Clock, Mountain, Wallet, Calendar } from 'lucide-react';
import { LocationData } from '@/types/location';

interface QuickStatsProps {
  location: LocationData;
}

export const QuickStats = ({ location }: QuickStatsProps) => {
  const stats = [
    {
      icon: Clock,
      label: 'Duration',
      value: location.estimatedDuration
    },
    {
      icon: Mountain,
      label: 'Difficulty',
      value: location.difficultyLevel
    },
    {
      icon: Wallet,
      label: 'Entry Fee',
      value: location.entryFee
    },
    {
      icon: Calendar,
      label: 'Best Time',
      value: location.bestTimeToVisit.split(' ')[0] + ' - ' + location.bestTimeToVisit.split(' ')[2]
    }
  ];

  return (
    <section className="relative -mt-24 z-20 px-6 md:px-12 lg:px-24">
      <div className="mx-auto max-w-6xl">
        <div className="glass-card rounded-2xl p-6 md:p-8">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((stat, index) => (
              <div 
                key={stat.label} 
                className="flex flex-col items-center text-center animate-scale-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </span>
                <span className="mt-1 font-semibold text-foreground">
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

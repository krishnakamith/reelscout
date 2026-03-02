import { Gem, Heart } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-card px-6 py-12 md:px-12 lg:px-24">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
              <Gem className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-serif text-xl font-semibold text-foreground">
              ReelScout
            </span>
          </div>
          
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            Made with <Heart className="h-4 w-4 fill-primary text-primary" /> for travelers who seek hidden gems
          </p>
          
          <p className="text-sm text-muted-foreground">
            © 2025 ReelScout. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

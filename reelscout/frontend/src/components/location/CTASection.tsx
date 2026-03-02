import { MessageCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const CTASection = () => {
  return (
    <section className="px-6 py-20 md:px-12 lg:px-24">
      <div className="mx-auto max-w-4xl text-center">
        <div className="mb-6 inline-flex items-center justify-center rounded-full bg-primary/10 px-4 py-2">
          <Sparkles className="mr-2 h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">AI-Powered Travel Assistant</span>
        </div>
        
        <h2 className="mb-6 font-serif text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">
          Have Questions About This Place?
        </h2>
        
        <p className="mb-8 text-lg text-muted-foreground max-w-2xl mx-auto">
          Our AI chatbot can answer specific questions about visiting this location, 
          help you plan your trip, and provide personalized recommendations.
        </p>
        
        <Button size="lg" className="gap-2 h-14 px-8 text-lg shadow-glow">
          <MessageCircle className="h-5 w-5" />
          Ask Our Travel Assistant
        </Button>
      </div>
    </section>
  );
};

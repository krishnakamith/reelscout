import { Camera } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";

interface GalleryFrame {
  src: string;
  alt: string;
  reelShortCode?: string;
  timestamp?: number;
}

interface FrameGalleryProps {
  frames?: GalleryFrame[];
}

const FrameGallery = ({ frames = [] }: FrameGalleryProps) => {
  return (
    <section className="py-16 sm:py-20 bg-secondary/40">
      <div className="section-container">
        <div className="flex items-center gap-3 mb-2">
          <Camera className="w-6 h-6 text-primary" />
          <h2 className="font-serif text-3xl sm:text-4xl text-foreground">Frame Gallery</h2>
        </div>
        <p className="text-muted-foreground mb-10 text-sm">AI-selected key frames from reels for this location</p>

        {frames.length === 0 ? (
          <div className="rounded-xl border border-border bg-card/50 p-6 text-sm text-muted-foreground">
            No selected frames available yet.
          </div>
        ) : (
          <Carousel opts={{ align: "start", loop: true }} className="w-full">
            <CarouselContent className="-ml-4">
              {frames.map((frame, i) => (
                <CarouselItem key={`${frame.src}-${i}`} className="pl-4 basis-4/5 sm:basis-1/2 md:basis-1/3">
                  <div className="masonry-item overflow-hidden rounded-xl">
                    <img
                      src={frame.src}
                      alt={frame.alt}
                      className="w-full h-64 sm:h-80 object-cover rounded-xl transition-transform duration-500 ease-out hover:scale-105"
                      loading="lazy"
                    />
                    <div className="px-1 pt-2 text-xs text-muted-foreground">
                      {frame.reelShortCode ? `Reel ${frame.reelShortCode}` : "Reel Frame"}
                      {typeof frame.timestamp === "number" ? ` · ${frame.timestamp.toFixed(1)}s` : ""}
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="-left-4 sm:-left-5 bg-card border-border text-foreground" />
            <CarouselNext className="-right-4 sm:-right-5 bg-card border-border text-foreground" />
          </Carousel>
        )}
      </div>
    </section>
  );
};

export default FrameGallery;

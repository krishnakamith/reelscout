import { useState } from "react";
import { Camera } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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
  const [expandedFrame, setExpandedFrame] = useState<GalleryFrame | null>(null);

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
          <Dialog>
            <Carousel opts={{ align: "start", loop: true }} className="w-full">
              <CarouselContent className="-ml-4">
                {frames.map((frame, i) => (
                  <CarouselItem key={`${frame.src}-${i}`} className="pl-4 basis-[72%] sm:basis-[56%] md:basis-[42%]">
                    <div className="masonry-item overflow-hidden rounded-xl">
                      <DialogTrigger asChild>
                        <button
                          type="button"
                          className="group block w-full rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          onClick={() => setExpandedFrame(frame)}
                        >
                          <img
                            src={frame.src}
                            alt={frame.alt}
                            className="w-full h-[24rem] sm:h-[30rem] object-cover rounded-xl transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                            loading="lazy"
                          />
                        </button>
                      </DialogTrigger>
                      <div className="px-1 pt-2 text-xs text-muted-foreground">
                        {frame.reelShortCode ? `Reel ${frame.reelShortCode}` : "Reel Frame"}
                        {typeof frame.timestamp === "number" ? ` · ${frame.timestamp.toFixed(1)}s` : ""}
                        <span className="ml-2 text-primary">Expand</span>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="-left-4 sm:-left-5 bg-card border-border text-foreground" />
              <CarouselNext className="-right-4 sm:-right-5 bg-card border-border text-foreground" />
            </Carousel>
            <DialogContent className="max-w-5xl w-[95vw] border-0 bg-transparent p-0 shadow-none">
              <DialogTitle className="sr-only">{expandedFrame?.alt ?? "Expanded frame"}</DialogTitle>
              {expandedFrame ? (
                <img
                  src={expandedFrame.src}
                  alt={expandedFrame.alt}
                  className="max-h-[88vh] w-full rounded-xl object-contain bg-black/80"
                />
              ) : null}
            </DialogContent>
          </Dialog>
        )}
      </div>
    </section>
  );
};

export default FrameGallery;


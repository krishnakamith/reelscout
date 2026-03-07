import { useState } from "react";
import { Camera, Expand } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

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
  const [selectedFrame, setSelectedFrame] = useState<GalleryFrame | null>(null);

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
                <CarouselItem key={`${frame.src}-${i}`} className="pl-4 basis-[92%] sm:basis-3/4 md:basis-1/2 lg:basis-2/5">
                  <button
                    type="button"
                    onClick={() => setSelectedFrame(frame)}
                    className="masonry-item overflow-hidden rounded-xl text-left w-full"
                  >
                    <img
                      src={frame.src}
                      alt={frame.alt}
                      className="w-full h-80 sm:h-[28rem] object-cover rounded-xl transition-transform duration-500 ease-out hover:scale-105"
                      loading="lazy"
                    />
                    <div className="px-1 pt-2 text-xs text-muted-foreground flex items-center justify-between gap-2">
                      <span>
                        {frame.reelShortCode ? `Reel ${frame.reelShortCode}` : "Reel Frame"}
                        {typeof frame.timestamp === "number" ? ` · ${frame.timestamp.toFixed(1)}s` : ""}
                      </span>
                      <span className="inline-flex items-center gap-1 text-foreground/80">
                        <Expand className="h-3.5 w-3.5" />
                        Expand
                      </span>
                    </div>
                  </button>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="-left-4 sm:-left-5 bg-card border-border text-foreground" />
            <CarouselNext className="-right-4 sm:-right-5 bg-card border-border text-foreground" />
          </Carousel>
        )}
      </div>

      <Dialog open={Boolean(selectedFrame)} onOpenChange={(open) => !open && setSelectedFrame(null)}>
        <DialogContent className="max-w-5xl p-2 sm:p-4">
          <DialogTitle className="sr-only">Expanded Frame Preview</DialogTitle>
          {selectedFrame ? (
            <img
              src={selectedFrame.src}
              alt={selectedFrame.alt}
              className="w-full max-h-[85vh] object-contain rounded-lg"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default FrameGallery;

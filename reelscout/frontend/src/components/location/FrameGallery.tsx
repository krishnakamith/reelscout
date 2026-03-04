import { Camera } from "lucide-react";
import frame1 from "@/assets/frame-1.jpg";
import frame2 from "@/assets/frame-2.jpg";
import frame3 from "@/assets/frame-3.jpg";
import frame4 from "@/assets/frame-4.jpg";
import frame5 from "@/assets/frame-5.jpg";
import frame6 from "@/assets/frame-6.jpg";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";

const frames = [
  { src: frame1, alt: "Temple garden with autumn leaves" },
  { src: frame2, alt: "Torii gate in bamboo forest" },
  { src: frame3, alt: "Traditional lantern street" },
  { src: frame4, alt: "Panoramic temple view with cherry blossoms" },
  { src: frame5, alt: "Matcha tea ceremony" },
  { src: frame6, alt: "Zen rock garden" },
];

const FrameGallery = () => {
  return (
    <section className="py-16 sm:py-20 bg-secondary/40">
      <div className="section-container">
        <div className="flex items-center gap-3 mb-2">
          <Camera className="w-6 h-6 text-primary" />
          <h2 className="font-serif text-3xl sm:text-4xl text-foreground">
            Frame Gallery
          </h2>
        </div>
        <p className="text-muted-foreground mb-10 text-sm">
          Key frames extracted from community reels
        </p>

        <Carousel
          opts={{ align: "start", loop: true }}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {frames.map((frame, i) => (
              <CarouselItem
                key={i}
                className="pl-4 basis-4/5 sm:basis-1/2 md:basis-1/3"
              >
                <div className="masonry-item overflow-hidden rounded-xl">
                  <img
                    src={frame.src}
                    alt={frame.alt}
                    className="w-full h-64 sm:h-80 object-cover rounded-xl transition-transform duration-500 ease-out hover:scale-105"
                    loading="lazy"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="-left-4 sm:-left-5 bg-card border-border text-foreground" />
          <CarouselNext className="-right-4 sm:-right-5 bg-card border-border text-foreground" />
        </Carousel>
      </div>
    </section>
  );
};

export default FrameGallery;

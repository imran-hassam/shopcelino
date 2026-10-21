"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";

/** Scroll-snap row with arrow buttons (reference: product sliders). */
export function Carousel({ children, label }: { children: React.ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const go = (dir: number) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  };
  return (
    <div className="relative" role="region" aria-roledescription="carousel" aria-label={label}>
      <div
        ref={ref}
        className="no-scrollbar relative -mx-1 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-1 pb-2 [&>*]:w-[72%] [&>*]:shrink-0 [&>*]:snap-start sm:[&>*]:w-[calc((100%-20px)/2)] md:[&>*]:w-[calc((100%-40px)/3)] lg:[&>*]:w-[calc((100%-60px)/4)]"
      >
        {children}
      </div>
      <button
        aria-label="Previous"
        onClick={() => go(-1)}
        className="absolute left-3 top-[38%] hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white shadow-md transition hover:bg-primary md:grid"
      >
        <ChevronLeft className="size-5" strokeWidth={1.5} />
      </button>
      <button
        aria-label="Next"
        onClick={() => go(1)}
        className="absolute right-3 top-[38%] hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white shadow-md transition hover:bg-primary md:grid"
      >
        <ChevronRight className="size-5" strokeWidth={1.5} />
      </button>
    </div>
  );
}

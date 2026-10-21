"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import type { WCImage } from "@/lib/types";

export function ProductGallery({ images, name }: { images: WCImage[]; name: string }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  // A chosen size/colour can switch the main photo.
  useEffect(() => {
    const onVar = (e: Event) => {
      const id = (e as CustomEvent<number>).detail;
      const i = images.findIndex((im) => im.id === id);
      if (i >= 0) setActive(i);
    };
    window.addEventListener("sc:variation-image", onVar);
    return () => window.removeEventListener("sc:variation-image", onVar);
  }, [images]);

  // Keep mobile swipe position in sync.
  useEffect(() => {
    const el = stripRef.current;
    if (el && el.offsetParent !== null) el.scrollTo({ left: el.clientWidth * active, behavior: "smooth" });
  }, [active]);

  if (!images.length) {
    return <div className="grid aspect-[4/5] place-items-center rounded-2xl bg-card text-muted">No image available</div>;
  }
  const img = images[active];

  return (
    <div className="lg:sticky lg:top-28 lg:self-start">
      {/* Desktop: hover-zoom main image */}
      <div
        className="relative hidden aspect-[4/5] cursor-zoom-in overflow-hidden rounded-2xl bg-card md:block"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onMouseLeave={() => setZoom(null)}
      >
        <img
          key={img.id}
          src={img.src}
          srcSet={img.srcset}
          sizes="(min-width:1024px) 55vw, 100vw"
          alt={img.alt || name}
          fetchPriority="high"
          className="size-full animate-[fadein_.4s_ease] object-cover object-top transition-transform duration-200"
          style={zoom ? { transform: "scale(1.8)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
        />
      </div>

      {/* Mobile: swipeable */}
      <div
        ref={stripRef}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-2xl md:hidden"
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / el.clientWidth);
          if (i !== active) setActive(i);
        }}
      >
        {images.map((im, i) => (
          <img
            key={im.id}
            src={im.src}
            srcSet={im.srcset}
            sizes="100vw"
            alt={im.alt || `${name} — photo ${i + 1}`}
            loading={i === 0 ? "eager" : "lazy"}
            className="aspect-[4/5] w-full shrink-0 snap-center bg-card object-cover object-top"
          />
        ))}
      </div>

      {images.length > 1 && (
        <div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto pb-1">
          {images.map((im, i) => (
            <button
              key={im.id}
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === active}
              className={`w-20 shrink-0 overflow-hidden rounded-lg border-2 transition md:w-24 ${
                i === active ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <img src={im.thumbnail} alt="" loading="lazy" className="aspect-[3/4] w-full bg-card object-cover object-top" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

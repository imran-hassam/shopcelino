"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Homepage "Featured Pieces" slider: 1 / 2 / 3 / 4 equal cards (mobile / 640px / 1024px / 1280px),
 * page-by-page arrows, native touch swipe, mouse drag and arrow keys. Arrow buttons reuse the
 * existing Carousel arrow style; only the Featured Pieces section uses this component.
 */
const GAP = 20; // matches gap-5

export function FeaturedSlider({ children, label }: { children: React.ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update]);

  const go = (dir: number) => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // One "page" = the visible cards plus one gap, so every page starts on a whole card.
    el.scrollBy({ left: dir * (el.clientWidth - 16 + GAP), behavior: reduce ? "auto" : "smooth" });
  };

  // Mouse drag (touch and pen use the browser's own swipe scrolling).
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || e.button !== 0 || !ref.current) return;
    drag.current = { x: e.clientX, left: ref.current.scrollLeft, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const el = ref.current;
    if (!d || !el) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 6) {
      d.moved = true;
      el.style.scrollSnapType = "none";
      el.style.scrollBehavior = "auto";
      el.setPointerCapture(e.pointerId);
    }
    if (d.moved) el.scrollLeft = d.left - dx;
  };
  const endDrag = () => {
    const d = drag.current;
    const el = ref.current;
    drag.current = null;
    if (!d?.moved || !el) return;
    suppressClick.current = true;
    // Settle on the nearest whole card.
    const card = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? el.clientWidth;
    const step = card + GAP;
    const target = Math.round(el.scrollLeft / step) * step;
    el.style.scrollBehavior = "";
    el.scrollTo({ left: target, behavior: "smooth" });
    window.setTimeout(() => {
      if (el) el.style.scrollSnapType = "";
    }, 400);
  };

  return (
    <div role="region" aria-roledescription="carousel" aria-label={label}>
      <div
        ref={ref}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "ArrowRight") {
            e.preventDefault();
            go(1);
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            go(-1);
          }
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDragStart={(e) => e.preventDefault()}
        onClickCapture={(e) => {
          if (suppressClick.current) {
            e.preventDefault();
            e.stopPropagation();
            suppressClick.current = false;
          }
        }}
        className="no-scrollbar -mx-2 -my-3 flex snap-x snap-mandatory scroll-px-2 gap-5 overflow-x-auto overscroll-x-contain px-2 pb-8 pt-3 outline-none focus-visible:ring-2 focus-visible:ring-primary/60 [&>*]:w-full [&>*]:shrink-0 [&>*]:snap-start sm:[&>*]:w-[calc((100%-20px)/2)] lg:[&>*]:w-[calc((100%-40px)/3)] xl:[&>*]:w-[calc((100%-60px)/4)]"
      >
        {children}
      </div>

      <div className="mt-4 flex justify-center gap-3">
        <button
          type="button"
          aria-label="Previous products"
          onClick={() => go(-1)}
          disabled={atStart}
          className="grid size-11 place-items-center rounded-full border border-white/70 bg-white/70 shadow-[0_10px_24px_-12px_rgba(34,32,29,.5)] backdrop-blur-md transition hover:bg-primary disabled:opacity-40 disabled:hover:bg-white/70"
        >
          <ChevronLeft className="size-5" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          aria-label="Next products"
          onClick={() => go(1)}
          disabled={atEnd}
          className="grid size-11 place-items-center rounded-full border border-white/70 bg-white/70 shadow-[0_10px_24px_-12px_rgba(34,32,29,.5)] backdrop-blur-md transition hover:bg-primary disabled:opacity-40 disabled:hover:bg-white/70"
        >
          <ChevronRight className="size-5" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

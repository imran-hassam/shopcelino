"use client";
/* eslint-disable @next/next/no-img-element */

/**
 * Product gallery as a "lookbook stage" (reference: client video, Nov 2026).
 *
 * The product's photos stand on a ring: the current photo large in front, its
 * neighbours smaller at the sides, the next ones faint behind. ← / → (or drag,
 * swipe, arrow keys, or a click on a side photo) turns the ring one step; the
 * stage dims briefly and its colour follows the photo in front. It plays on its
 * own, with a pause control, like the reference.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { WCImage } from "@/lib/types";

const TURN_MS = 900; // ring turn + background change, as in the reference
const AUTOPLAY_MS = 5000;
const EASE = "cubic-bezier(.7,0,.3,1)";

// Used when a photo's colour can't be read (no CORS on the image host).
// Cream, charcoal, camel, silver, espresso — the reference's sequence, in brand-safe tones.
const FALLBACK_TINTS = ["#ECE6D8", "#2B2926", "#CDB38C", "#D8DBD5", "#4A3B32"];

type Slot = { x: number; y: number; s: number; o: number; z: number; blur: number };
type Geo = { w: number; h: number; cardH: number; cardW: number; sideX: number; ghostX: number; sideS: number; base: number };

/** Ring positions by offset from the front (0). ±3 = hidden behind. Interpolated for drags. */
function slotAt(d: number, g: Geo): Slot {
  const keys: [number, Slot][] = [
    [-3, { x: -0.06 * g.w, y: -0.06, s: 0.5, o: 0, z: 0, blur: 3 }],
    [-2, { x: -g.ghostX, y: -0.035, s: 0.56, o: 0.3, z: 1, blur: 1.5 }],
    [-1, { x: -g.sideX, y: -0.015, s: g.sideS, o: 1, z: 2, blur: 0 }],
    [0, { x: 0, y: 0, s: 1, o: 1, z: 3, blur: 0 }],
    [1, { x: g.sideX, y: -0.015, s: g.sideS, o: 1, z: 2, blur: 0 }],
    [2, { x: g.ghostX, y: -0.035, s: 0.56, o: 0.3, z: 1, blur: 1.5 }],
    [3, { x: 0.06 * g.w, y: -0.06, s: 0.5, o: 0, z: 0, blur: 3 }],
  ];
  const c = Math.max(-3, Math.min(3, d));
  let i = 0;
  while (i < keys.length - 2 && c > keys[i + 1][0]) i++;
  const [d0, a] = keys[i];
  const [d1, b] = keys[i + 1];
  const t = (c - d0) / (d1 - d0);
  const mix = (p: number, q: number) => p + (q - p) * t;
  return { x: mix(a.x, b.x), y: mix(a.y, b.y), s: mix(a.s, b.s), o: mix(a.o, b.o), z: mix(a.z, b.z), blur: mix(a.blur, b.blur) };
}

/** Signed ring distance of photo i from the front, in (-n/2, n/2]. Ties lean towards `lean`. */
function ringOffset(i: number, pos: number, n: number, lean: number) {
  let d = (((i - pos) % n) + n) % n;
  if (d > n / 2 || (d === n / 2 && lean > 0)) d -= n;
  return d;
}

function geometry(w: number, h: number): Geo {
  const phone = w < 640;
  // Front photo ≈ 60% of the stage height on wide screens, like the front model in the reference.
  const cardH = h * (phone ? 0.66 : 0.62);
  const cardW = cardH * 0.75; // 3:4 cards, same crop as the old thumbnails
  const sideS = phone ? 0.8 : 0.72;
  // Wide: sides stand fully inside the stage, just clear of the front photo.
  // Phone: sides peek in from the edges so the front photo stays large.
  const sideX = phone ? cardW * 0.5 + (cardW * sideS) / 2 + w * 0.05 : Math.max(w * 0.32, cardW * 0.5 + (cardW * sideS) / 2 + 14);
  const ghostX = phone ? w * 0.3 : w * 0.19;
  return { w, h, cardH, cardW, sideX, ghostX, sideS, base: h * (phone ? 0.8 : 0.85) };
}

function hexToRgb(hex: string) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
function isDark([r, g, b]: number[]) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 118;
}

/** Average border colour of a photo (its backdrop), read from the small thumbnail. */
function useTints(images: WCImage[]) {
  const [tints, setTints] = useState<Record<number, number[]>>({});
  useEffect(() => {
    let alive = true;
    images.forEach((im) => {
      const probe = new Image();
      probe.crossOrigin = "anonymous";
      probe.decoding = "async";
      probe.onload = () => {
        try {
          const c = document.createElement("canvas");
          c.width = c.height = 24;
          const ctx = c.getContext("2d", { willReadFrequently: true });
          if (!ctx) return;
          ctx.drawImage(probe, 0, 0, 24, 24);
          const px = ctx.getImageData(0, 0, 24, 24).data;
          let r = 0, g = 0, b = 0, k = 0;
          for (let y = 0; y < 24; y++)
            for (let x = 0; x < 24; x++) {
              if (x > 1 && x < 22 && y > 1) continue; // top + side borders only (floor/feet vary)
              const o = (y * 24 + x) * 4;
              r += px[o]; g += px[o + 1]; b += px[o + 2]; k++;
            }
          if (alive && k) setTints((t) => ({ ...t, [im.id]: [r / k, g / k, b / k] }));
        } catch {
          /* tainted canvas: keep the fallback tint */
        }
      };
      probe.src = im.thumbnail || im.src;
    });
    return () => {
      alive = false;
    };
  }, [images]);
  return tints;
}

export function ProductGallery({ images, name, label }: { images: WCImage[]; name: string; label?: string }) {
  const n = images.length;
  const [pos, setPos] = useState(0); // index of the photo in front
  const [lean, setLean] = useState(1); // last turn direction, for even-count ties
  const [turnId, setTurnId] = useState(0); // restarts the dim veil
  const [drag, setDrag] = useState(0); // live drag, in ring steps
  const [dragging, setDragging] = useState(false);
  const [geo, setGeo] = useState<Geo | null>(null);
  const [playing, setPlaying] = useState(true);
  const [hold, setHold] = useState(false); // hover / focus / hidden tab
  const [reduced, setReduced] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const tints = useTints(images);
  const posRef = useRef(0);
  useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  const goTo = useCallback(
    (i: number, dir?: number) => {
      if (n < 2) return;
      const cur = posRef.current;
      const next = ((i % n) + n) % n;
      if (next === cur) return;
      posRef.current = next;
      setLean(dir ?? (ringOffset(next, cur, n, 1) > 0 ? 1 : -1));
      setTurnId((t) => t + 1);
      setPos(next);
    },
    [n],
  );
  const step = useCallback((dir: 1 | -1) => goTo(pos + dir, dir), [goTo, pos]);

  // Measure the stage; everything is laid out from its size.
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setGeo(geometry(e.contentRect.width, e.contentRect.height)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Reduced motion: no autoplay, no animated turns.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const set = () => {
      setReduced(mq.matches);
      if (mq.matches) setPlaying(false);
    };
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);

  // A chosen size/colour can switch the front photo (existing behaviour).
  useEffect(() => {
    const onVar = (e: Event) => {
      const id = (e as CustomEvent<number>).detail;
      const i = images.findIndex((im) => im.id === id);
      if (i >= 0 && i !== posRef.current) {
        goTo(i);
        setPlaying(false); // keep the chosen variant's photo in front
      }
    };
    window.addEventListener("sc:variation-image", onVar);
    return () => window.removeEventListener("sc:variation-image", onVar);
  }, [images, goTo]);

  // Autoplay, paused while hovered, focused, dragged, off-screen tab.
  useEffect(() => {
    if (!playing || hold || dragging || n < 2) return;
    const t = window.setTimeout(() => goTo(pos + 1, 1), AUTOPLAY_MS);
    return () => window.clearTimeout(t);
  }, [playing, hold, dragging, pos, n, goTo, turnId]);
  useEffect(() => {
    const vis = () => setHold(document.hidden);
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, []);

  // Drag / swipe (mouse, pen, touch). Vertical scrolling stays with the page.
  const dragRef = useRef<{ x: number; y: number; t: number; id: number; axis: "x" | "y" | null; moved: boolean } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (n < 2 || (e.pointerType === "mouse" && e.button !== 0)) return;
    dragRef.current = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId, axis: null, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId || !geo) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.axis) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      d.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (d.axis === "x") {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        setDragging(true);
      }
    }
    if (d.axis !== "x") return;
    d.moved = true;
    setDrag(-dx / geo.sideX);
  };
  const endDrag = (e: React.PointerEvent) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || d.axis !== "x" || !geo) return;
    const dx = e.clientX - d.x;
    const v = dx / Math.max(1, performance.now() - d.t); // px/ms
    let steps = Math.round(-dx / geo.sideX);
    if (e.pointerType !== "mouse") steps = Math.max(-1, Math.min(1, steps)); // one photo per swipe
    if (steps === 0 && (Math.abs(dx) > geo.w * 0.08 || Math.abs(v) > 0.45)) steps = dx < 0 ? 1 : -1;
    setDragging(false);
    setDrag(0);
    if (steps) goTo(pos + steps, steps > 0 ? 1 : -1);
    // Swallow the click that follows a drag so it doesn't select a side photo.
    if (d.moved) {
      const stop = (ev: Event) => ev.stopPropagation();
      window.addEventListener("click", stop, { capture: true, once: true });
      window.setTimeout(() => window.removeEventListener("click", stop, { capture: true }), 0);
    }
  };

  if (!n) {
    return <div className="grid aspect-[4/5] place-items-center rounded-2xl bg-card text-muted">No image available</div>;
  }

  const front = images[pos];
  const rgb = tints[front.id] ?? hexToRgb(FALLBACK_TINTS[pos % FALLBACK_TINTS.length]);
  const dark = isDark(rgb);
  const ink = dark ? "#FAF8F2" : "#22201D";
  const bg = `rgb(${rgb.map((c) => Math.round(c * (dark ? 1 : 0.94))).join(",")})`;
  const floor = dark ? "rgba(255,255,255,.07)" : "rgba(255,255,255,.34)";
  const word = (label || "Celino").toUpperCase();
  const pad = (v: number) => String(v).padStart(2, "0");
  const dur = reduced || dragging ? 0 : TURN_MS;
  const live = pos + drag; // fractional during a drag

  return (
    <div className="lg:sticky lg:top-28 lg:self-start">
      <div
        ref={stageRef}
        role="region"
        aria-roledescription="carousel"
        aria-label={`${name} photos`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
          if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
        }}
        onMouseEnter={() => setHold(true)}
        onMouseLeave={() => setHold(false)}
        onFocus={() => setHold(true)}
        onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setHold(false)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={`relative isolate aspect-[4/5] w-full touch-pan-y select-none overflow-hidden rounded-3xl outline-none ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-primary sm:aspect-[4/3] lg:aspect-auto lg:h-[clamp(460px,76svh,760px)] ${
          n > 1 ? (dragging ? "cursor-grabbing" : "cursor-grab") : ""
        }`}
        style={{ backgroundColor: bg, color: ink, transition: `background-color ${dur}ms ${EASE}, color ${dur}ms ${EASE}` }}
      >
        {/* Backdrop: giant word, thin circle, curved floor */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 [container-type:size]">
          <div
            className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-sans font-black leading-none tracking-[-0.02em]"
            style={{ fontSize: `min(${Math.round(150 / Math.max(5, word.length))}cqw, 34cqh)`, opacity: dark ? 0.07 : 0.06 }}
          >
            {word}
          </div>
          <div
            className="absolute left-1/2 top-[44%] aspect-square w-[min(62cqh,52cqw)] -translate-x-1/2 -translate-y-1/2 rounded-full border"
            style={{ borderColor: "currentColor", opacity: 0.14 }}
          />
          <div
            className="absolute left-1/2 top-[84%] h-[70cqh] w-[150cqw] -translate-x-1/2 rounded-[50%]"
            style={{ background: floor, boxShadow: `inset 0 1px 0 ${dark ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.5)"}` }}
          />
        </div>

        {/* Photos on the ring */}
        {geo &&
          images.map((im, i) => {
            const d = ringOffset(i, live, n, lean);
            const s = slotAt(n === 1 ? 0 : d, geo);
            const isFront = i === pos;
            const visible = s.o > 0.01;
            return (
              <button
                key={im.id}
                type="button"
                tabIndex={-1}
                aria-hidden={!isFront}
                onClick={() => !isFront && goTo(i)}
                className={`absolute left-1/2 top-0 block overflow-hidden rounded-2xl bg-card shadow-[0_28px_50px_-30px_rgba(0,0,0,.6)] ${isFront ? "cursor-[inherit]" : "cursor-pointer"}`}
                style={{
                  width: geo.cardW,
                  height: geo.cardH,
                  transform: `translate3d(${s.x - geo.cardW / 2}px, ${geo.base - geo.cardH + s.y * geo.h}px, 0) scale(${s.s})`,
                  transformOrigin: "50% 100%",
                  opacity: s.o,
                  zIndex: Math.round(s.z * 10),
                  filter: s.blur > 0.05 ? `blur(${s.blur}px) saturate(${1 - s.blur * 0.15})` : undefined,
                  visibility: visible ? "visible" : "hidden",
                  pointerEvents: visible ? "auto" : "none",
                  transition: dur
                    ? `transform ${dur}ms ${EASE}, opacity ${dur}ms ${EASE}, filter ${dur}ms ${EASE}, visibility 0s linear ${visible ? 0 : dur}ms`
                    : "none",
                }}
              >
                <img
                  src={im.src}
                  srcSet={im.srcset || undefined}
                  sizes={`${Math.ceil(geo.cardW)}px`}
                  alt={isFront ? im.alt || `${name} — photo ${i + 1}` : ""}
                  width={Math.round(geo.cardW)}
                  height={Math.round(geo.cardH)}
                  draggable={false}
                  loading={Math.abs(d) <= 1 ? "eager" : "lazy"}
                  fetchPriority={i === 0 ? "high" : undefined}
                  className="size-full object-cover object-top"
                />
              </button>
            );
          })}

        {/* Brief dim on every turn, as in the reference */}
        {!reduced && turnId > 0 && (
          <div
            key={turnId}
            aria-hidden
            className="pointer-events-none absolute inset-0 z-40"
            style={{ background: "#14120F", animation: `sc-stage-dim ${TURN_MS}ms ${EASE} both` }}
          />
        )}

        {/* Labels and controls */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-50 flex items-start justify-between p-4 text-[9px] font-semibold uppercase tracking-[0.28em] sm:p-6 sm:text-[10px]">
          <span className="flex items-center gap-2">
            <span className="size-1 rounded-full bg-current" />
            The Lookbook
          </span>
          {n > 1 && (
            <span className="opacity-60">
              <span className="sm:hidden">Swipe or tap a view</span>
              <span className="hidden sm:inline">Drag or select a view</span>
            </span>
          )}
        </div>

        {n > 1 && (
          <div className="absolute inset-x-0 bottom-0 z-50 grid grid-cols-[1fr_auto_1fr] items-end px-2 pb-2 text-[9px] font-semibold uppercase tracking-[0.28em] sm:px-4 sm:pb-3 sm:text-[10px]">
            <span className="hidden min-h-11 items-center truncate pl-2 opacity-60 sm:flex">
              {pad(1)} — {pad(n)}
              <span className="ml-4">{name}</span>
            </span>
            <span className="sm:hidden" />
            <div className="flex items-center justify-self-center pb-6 sm:pb-9">
              <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className="grid size-11 place-items-center rounded-full transition hover:bg-current/10">
                <Arrow dir={-1} />
              </button>
              <span className="min-w-[8.5em] text-center tabular-nums" aria-live="polite">
                View {pad(pos + 1)} / {pad(n)}
              </span>
              <button type="button" onClick={() => step(1)} aria-label="Next photo" className="grid size-11 place-items-center rounded-full transition hover:bg-current/10">
                <Arrow dir={1} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-pressed={!playing}
              className="flex min-h-11 items-center gap-2 justify-self-end px-2 font-semibold uppercase tracking-[0.28em] opacity-70 transition hover:opacity-100"
            >
              <span className="hidden sm:inline">{playing ? "Pause slider" : "Play slider"}</span>
              {playing ? (
                <svg width="8" height="9" viewBox="0 0 8 9" aria-hidden><path d="M1 0v9M7 0v9" stroke="currentColor" strokeWidth="1.6" /></svg>
              ) : (
                <svg width="8" height="9" viewBox="0 0 8 9" aria-hidden><path d="M0 0l8 4.5L0 9z" fill="currentColor" /></svg>
              )}
              <span className="sr-only sm:hidden">{playing ? "Pause slider" : "Play slider"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Arrow({ dir }: { dir: 1 | -1 }) {
  return (
    <svg width="18" height="8" viewBox="0 0 18 8" aria-hidden style={{ transform: dir < 0 ? "scaleX(-1)" : undefined }}>
      <path d="M0 4h16M13 1l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

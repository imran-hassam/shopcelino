"use client";
/* eslint-disable @next/next/no-img-element */

/**
 * Product gallery as a "lookbook stage" (reference: client video, Nov 2026).
 *
 * The product's own photos stand on a ring — the white studio backdrop lifted off
 * in the browser so the model stands on the stage — with the current photo large in
 * front, its neighbours smaller at the sides and the next ones faint behind.
 * It turns on its own (Play/Pause), or with ← / →, drag, swipe or the arrow keys;
 * the stage dims briefly and steps to the next Shop Celino colour on every turn.
 * Tapping a photo opens the original, unedited photos in a full-screen viewer.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { WCImage } from "@/lib/types";
import { cutout, type Cutout } from "@/lib/cutout";

const TURN_MS = 600; // ring turn + background change
const AUTOPLAY_MS = 2800; // time between automatic turns
const EASE = "cubic-bezier(.7,0,.3,1)";

/** Site colours only (globals.css brand tokens). Stage colour steps through these. */
const C = {
  background: "#FAF8F2",
  card: "#F3EEE3",
  secondary: "#E6D9A8",
  accent: "#E6EBE3",
  heading: "#22201D",
  muted: "#8A8075",
  primary: "#C6AC18",
  footerText: "#FAF8F2",
};
const STAGES = [
  { bg: C.card, dark: false },
  { bg: C.heading, dark: true },
  { bg: C.secondary, dark: false },
  { bg: C.accent, dark: false },
];

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
  const cardH = h * (phone ? 0.68 : 0.64);
  const cardW = cardH * 0.75;
  const sideS = phone ? 0.8 : 0.72;
  // Wide: sides stand fully inside the stage, just clear of the front photo.
  // Phone: sides peek in from the edges so the front photo stays large.
  const sideX = phone ? cardW * 0.5 + (cardW * sideS) / 2 + w * 0.02 : Math.max(w * 0.3, cardW * 0.5 + (cardW * sideS) / 2 + 8);
  const ghostX = phone ? w * 0.3 : w * 0.18;
  return { w, h, cardH, cardW, sideX, ghostX, sideS, base: h * (phone ? 0.81 : 0.86) };
}

/** Smallest WooCommerce size that is still sharp at `px` wide (falls back to the full image). */
function pickSrc(im: WCImage, px: number) {
  const opts = (im.srcset || "")
    .split(",")
    .map((s) => s.trim().split(/\s+/))
    .map(([u, d]) => ({ u, w: parseInt(d) }))
    .filter((o) => o.u && o.w > 0)
    .sort((a, b) => a.w - b.w);
  return opts.find((o) => o.w >= px)?.u ?? im.src;
}

/** Cut-out versions of the photos, front photo first. undefined = still working, null = keep as is. */
function useCutouts(images: WCImage[], pos: number, width: number) {
  const [cuts, setCuts] = useState<Record<number, Cutout | null>>({});
  const latest = useRef({ pos, width });
  useEffect(() => {
    latest.current = { pos, width };
  }, [pos, width]);
  const ready = width > 0;
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    const n = images.length;
    const { pos: p0, width: w0 } = latest.current;
    const order = images.map((_, i) => i).sort((a, b) => Math.abs(ringOffset(a, p0, n, 1)) - Math.abs(ringOffset(b, p0, n, 1)));
    const target = Math.min(1100, Math.round(w0 * Math.min(2, window.devicePixelRatio || 1)));
    (async () => {
      for (const i of order) {
        const im = images[i];
        const timeout = new Promise<null>((r) => setTimeout(() => r(null), 9000));
        const res = await Promise.race([cutout(pickSrc(im, target)), timeout]);
        if (!alive) return;
        setCuts((c) => ({ ...c, [im.id]: res }));
      }
    })();
    return () => {
      alive = false;
    };
  }, [images, ready]);
  return cuts;
}

export function ProductGallery({ images, name, label }: { images: WCImage[]; name: string; label?: string }) {
  const n = images.length;
  const [pos, setPos] = useState(0); // index of the photo in front
  const [lean, setLean] = useState(1); // last turn direction, for even-count ties
  const [turnId, setTurnId] = useState(0); // restarts the dim veil
  const [drag, setDrag] = useState(0); // live drag, in ring steps
  const [dragging, setDragging] = useState(false);
  const [geo, setGeo] = useState<Geo | null>(null);
  const [playing, setPlaying] = useState(true); // autoplay on by default
  const [hover, setHover] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null); // open photo in the full-screen viewer
  const stageRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(0);
  const userActed = useRef(false);
  useEffect(() => {
    posRef.current = pos;
  }, [pos]);
  const cuts = useCutouts(images, pos, geo?.cardH ?? 0);

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
  const step = useCallback((dir: 1 | -1) => goTo(posRef.current + dir, dir), [goTo]);

  // Measure the stage; everything is laid out from its size.
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setGeo(geometry(e.contentRect.width, e.contentRect.height)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Reduced motion: turns happen without movement (autoplay stays on, as requested).
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const set = () => setReduced(mq.matches);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);

  // Track whether the shopper has interacted, so the default variant chosen on load doesn't stop autoplay.
  useEffect(() => {
    const mark = () => (userActed.current = true);
    window.addEventListener("pointerdown", mark, { capture: true });
    window.addEventListener("keydown", mark, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", mark, { capture: true });
      window.removeEventListener("keydown", mark, { capture: true });
    };
  }, []);

  // A chosen size/colour can switch the front photo (existing behaviour).
  useEffect(() => {
    const onVar = (e: Event) => {
      const id = (e as CustomEvent<number>).detail;
      const i = images.findIndex((im) => im.id === id);
      if (i >= 0 && i !== posRef.current) {
        goTo(i);
        if (userActed.current) setPlaying(false); // keep the chosen variant's photo in front
      }
    };
    window.addEventListener("sc:variation-image", onVar);
    return () => window.removeEventListener("sc:variation-image", onVar);
  }, [images, goTo]);

  // Autoplay — held while hovered, dragged, viewer open, or the tab is hidden.
  useEffect(() => {
    if (!playing || hover || dragging || hidden || viewer !== null || n < 2) return;
    const t = window.setTimeout(() => goTo(posRef.current + 1, 1), AUTOPLAY_MS);
    return () => window.clearTimeout(t);
  }, [playing, hover, dragging, hidden, viewer, n, goTo, turnId]);
  useEffect(() => {
    const vis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, []);

  // Drag / swipe (mouse, pen, touch). Vertical scrolling stays with the page.
  const dragRef = useRef<{ x: number; y: number; t: number; id: number; axis: "x" | "y" | null; moved: boolean } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (n < 2 || (e.pointerType === "mouse" && e.button !== 0)) return;
    if ((e.target as HTMLElement).closest("[data-control]")) return;
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
    if (steps) goTo(posRef.current + steps, steps > 0 ? 1 : -1);
    // Swallow the click that follows a drag so it doesn't open the viewer.
    if (d.moved) {
      const stop = (ev: Event) => ev.stopPropagation();
      window.addEventListener("click", stop, { capture: true, once: true });
      window.setTimeout(() => window.removeEventListener("click", stop, { capture: true }), 0);
    }
  };

  if (!n) {
    return <div className="grid aspect-[4/5] place-items-center rounded-2xl bg-card text-muted">No image available</div>;
  }

  const stage = STAGES[pos % STAGES.length];
  const ink = stage.dark ? C.footerText : C.heading;
  const soft = stage.dark ? C.secondary : C.muted; // secondary labels
  const floor = stage.dark ? "rgba(250,248,242,.06)" : "rgba(250,248,242,.6)"; // background colour, translucent
  const word = (label || "Celino").toUpperCase();
  const pad = (v: number) => String(v).padStart(2, "0");
  const dur = reduced || dragging ? 0 : TURN_MS;
  const live = pos + drag; // fractional during a drag
  const colorT = `${reduced ? 0 : TURN_MS}ms ${EASE}`;

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
          if (e.key === "Enter" && e.target === e.currentTarget) setViewer(posRef.current);
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={`relative isolate aspect-[4/5] w-full touch-pan-y select-none overflow-hidden rounded-3xl outline-none ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-primary sm:aspect-[4/3] lg:aspect-auto lg:h-[clamp(460px,76svh,760px)] ${
          dragging ? "cursor-grabbing" : ""
        }`}
        style={{ backgroundColor: stage.bg, color: ink, transition: `background-color ${colorT}, color ${colorT}` }}
      >
        {/* Backdrop: giant word, thin circle, curved floor */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 [container-type:size]">
          <div
            className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-sans font-black leading-none tracking-[-0.02em]"
            style={{ fontSize: `min(${Math.round(150 / Math.max(5, word.length))}cqw, 34cqh)`, color: soft, opacity: stage.dark ? 0.16 : 0.14, transition: `color ${colorT}` }}
          >
            {word}
          </div>
          <div
            className="absolute left-1/2 top-[44%] aspect-square w-[min(62cqh,52cqw)] -translate-x-1/2 -translate-y-1/2 rounded-full border"
            style={{ borderColor: soft, opacity: 0.35, transition: `border-color ${colorT}` }}
          />
          <div className="absolute left-1/2 top-[84%] h-[70cqh] w-[150cqw] -translate-x-1/2 rounded-[50%]" style={{ background: floor, transition: `background ${colorT}` }} />
        </div>

        {/* Photos on the ring */}
        {geo &&
          images.map((im, i) => {
            const d = ringOffset(i, live, n, lean);
            const s = slotAt(n === 1 ? 0 : d, geo);
            const isFront = i === pos;
            const visible = s.o > 0.01;
            const cut = cuts[im.id];
            const ready = cut !== undefined;
            // Cut-outs use their own shape (square studio shots stay full height); framed photos keep 3:4.
            const boxW = cut ? geo.cardH * Math.min(1, cut.w / cut.h) : geo.cardW;
            const filters = [
              cut ? `drop-shadow(0 22px 18px rgba(34,32,29,${stage.dark ? 0.45 : 0.22}))` : "",
              s.blur > 0.05 ? `blur(${s.blur}px) saturate(${1 - s.blur * 0.15})` : "",
            ].join(" ").trim();
            return (
              <button
                key={im.id}
                type="button"
                tabIndex={-1}
                aria-hidden={!isFront}
                aria-label={isFront ? "Open photo" : undefined}
                onClick={() => setViewer(i)}
                className={`absolute left-1/2 top-0 block cursor-zoom-in ${cut === null ? "overflow-hidden rounded-2xl bg-card shadow-[0_28px_50px_-30px_rgba(34,32,29,.6)]" : ""}`}
                style={{
                  width: boxW,
                  height: geo.cardH,
                  transform: `translate3d(${s.x - boxW / 2}px, ${geo.base - geo.cardH + s.y * geo.h}px, 0) scale(${s.s})`,
                  transformOrigin: "50% 100%",
                  opacity: ready ? s.o : 0,
                  zIndex: Math.round(s.z * 10),
                  filter: filters || undefined,
                  visibility: visible ? "visible" : "hidden",
                  pointerEvents: visible ? "auto" : "none",
                  transition: dur
                    ? `transform ${dur}ms ${EASE}, opacity ${dur}ms ${EASE}, filter ${dur}ms ${EASE}, visibility 0s linear ${visible ? 0 : dur}ms`
                    : "opacity 300ms ease",
                }}
              >
                {cut ? (
                  <img src={cut.url} alt={isFront ? im.alt || `${name} — photo ${i + 1}` : ""} draggable={false} className="size-full object-contain object-bottom" />
                ) : cut === null ? (
                  <img
                    src={im.src}
                    srcSet={im.srcset || undefined}
                    sizes={`${Math.ceil(geo.cardW)}px`}
                    alt={isFront ? im.alt || `${name} — photo ${i + 1}` : ""}
                    draggable={false}
                    className="size-full object-cover object-top"
                  />
                ) : null}
              </button>
            );
          })}

        {/* Front photo still being prepared */}
        {geo && cuts[images[pos].id] === undefined && (
          <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="size-7 animate-spin rounded-full border-2 border-current border-t-transparent opacity-40" />
          </div>
        )}

        {/* Brief dim on every turn, as in the reference */}
        {!reduced && turnId > 0 && (
          <div
            key={turnId}
            aria-hidden
            className="pointer-events-none absolute inset-0 z-40"
            style={{ background: C.heading, animation: `sc-stage-dim ${TURN_MS}ms ${EASE} both` }}
          />
        )}

        {/* Labels and controls */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-50 flex items-start justify-between p-4 text-[9px] font-semibold uppercase tracking-[0.28em] sm:p-6 sm:text-[10px]">
          <span className="flex items-center gap-2">
            <span className="size-1.5 rounded-full" style={{ background: C.primary }} />
            The Lookbook
          </span>
          <span style={{ color: soft, transition: `color ${colorT}` }}>
            <span className="sm:hidden">{n > 1 ? "Swipe · tap to open" : "Tap to open"}</span>
            <span className="hidden sm:inline">{n > 1 ? "Drag or select a view" : "Select to open"}</span>
          </span>
        </div>

        {n > 1 && (
          <div className="absolute inset-x-0 bottom-0 z-50 grid grid-cols-[1fr_auto_1fr] items-end px-2 pb-2 text-[9px] font-semibold uppercase tracking-[0.28em] sm:px-4 sm:pb-3 sm:text-[10px]">
            <span className="hidden min-h-11 items-center truncate pl-2 sm:flex" style={{ color: soft, transition: `color ${colorT}` }}>
              {pad(1)} — {pad(n)}
              <span className="ml-4 truncate">{name}</span>
            </span>
            <span className="sm:hidden" />
            <div data-control className="flex items-center justify-self-center pb-6 sm:pb-8">
              <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className="grid size-11 place-items-center rounded-full transition hover:text-primary">
                <Arrow dir={-1} />
              </button>
              <span className="min-w-[8.5em] text-center tabular-nums" aria-live="polite">
                View {pad(pos + 1)} / {pad(n)}
              </span>
              <button type="button" onClick={() => step(1)} aria-label="Next photo" className="grid size-11 place-items-center rounded-full transition hover:text-primary">
                <Arrow dir={1} />
              </button>
            </div>
            <button
              data-control
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-pressed={!playing}
              aria-label={playing ? "Pause slider" : "Play slider"}
              className="flex min-h-11 items-center gap-2 justify-self-end px-2 font-semibold uppercase tracking-[0.28em] transition hover:text-primary"
              style={{ color: soft }}
            >
              <span className="hidden sm:inline">{playing ? "Pause slider" : "Play slider"}</span>
              {playing ? (
                <svg width="8" height="9" viewBox="0 0 8 9" aria-hidden><path d="M1 0v9M7 0v9" stroke="currentColor" strokeWidth="1.6" /></svg>
              ) : (
                <svg width="8" height="9" viewBox="0 0 8 9" aria-hidden><path d="M0 0l8 4.5L0 9z" fill="currentColor" /></svg>
              )}
            </button>
          </div>
        )}
      </div>

      {viewer !== null && <PhotoViewer images={images} start={viewer} name={name} onClose={() => setViewer(null)} />}
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

/**
 * Full-screen viewer of the original photos (untouched WooCommerce files): shown at
 * their native pixel size when they fit, scaled down to fit otherwise, never cropped.
 */
function PhotoViewer({ images, start, name, onClose }: { images: WCImage[]; start: number; name: string; onClose: () => void }) {
  const n = images.length;
  const [i, setI] = useState(start);
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});
  const closeRef = useRef<HTMLButtonElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const go = useCallback((d: number) => setI((v) => (((v + d) % n) + n) % n), [n]);
  const im = images[i];

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      html.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [onClose, go]);

  // Preload neighbours; keep the active thumbnail in view.
  useEffect(() => {
    [1, -1].forEach((d) => {
      const p = new Image();
      p.src = images[(((i + d) % n) + n) % n].src;
    });
    thumbsRef.current?.querySelector<HTMLElement>(`[data-i="${i}"]`)?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [i, images, n]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${name} — photo ${i + 1} of ${n}`}
      className="fixed inset-0 z-[1000] grid grid-rows-[auto_minmax(0,1fr)_auto]"
      style={{ background: C.heading, color: C.footerText, animation: "sc-viewer-in .25s ease both" }}
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const f = [...e.currentTarget.querySelectorAll<HTMLElement>("button")];
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }}
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.28em] sm:px-6">
        <span className="truncate" style={{ color: C.secondary }}>
          <span className="tabular-nums" style={{ color: C.footerText }}>{String(i + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}</span>
          <span className="ml-4 hidden sm:inline">{name}</span>
        </span>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close gallery" className="grid size-11 shrink-0 place-items-center rounded-full transition hover:text-primary">
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden><path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="1.6" /></svg>
        </button>
      </div>

      <div
        className="relative flex min-h-0 touch-pan-y items-center justify-center px-3 sm:px-20"
        onClick={(e) => e.target === e.currentTarget && onClose()}
        onPointerDown={(e) => (swipe.current = { x: e.clientX, y: e.clientY })}
        onPointerUp={(e) => {
          const s = swipe.current;
          swipe.current = null;
          if (!s || n < 2) return;
          const dx = e.clientX - s.x;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - s.y)) go(dx < 0 ? 1 : -1);
        }}
      >
        {!loaded[im.id] && <span aria-hidden className="absolute size-8 animate-spin rounded-full border-2 border-current border-t-transparent opacity-50" />}
        <img
          key={im.id}
          src={im.src}
          alt={im.alt || `${name} — photo ${i + 1}`}
          draggable={false}
          onLoad={() => setLoaded((l) => ({ ...l, [im.id]: true }))}
          className="block h-auto max-h-full w-auto max-w-full select-none object-contain transition-opacity duration-300"
          style={{ opacity: loaded[im.id] ? 1 : 0 }}
        />
        {n > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-1 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full transition hover:text-primary sm:left-5" style={{ background: "rgba(34,32,29,.55)" }}>
              <Arrow dir={-1} />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute right-1 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full transition hover:text-primary sm:right-5" style={{ background: "rgba(34,32,29,.55)" }}>
              <Arrow dir={1} />
            </button>
          </>
        )}
      </div>

      {n > 1 && (
        <div ref={thumbsRef} className="no-scrollbar flex justify-start gap-2 overflow-x-auto px-4 py-3 sm:justify-center sm:px-6">
          {images.map((t, k) => (
            <button
              key={t.id}
              data-i={k}
              type="button"
              onClick={() => setI(k)}
              aria-label={`Show photo ${k + 1}`}
              aria-current={k === i}
              className="w-12 shrink-0 overflow-hidden rounded-lg border-2 transition sm:w-14"
              style={{ borderColor: k === i ? C.primary : "transparent", opacity: k === i ? 1 : 0.6 }}
            >
              <img src={t.thumbnail} alt="" loading="lazy" className="aspect-[3/4] w-full object-cover object-top" style={{ background: C.card }} />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}

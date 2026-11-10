"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play, X } from "lucide-react";
import type { WCPrices } from "@/lib/types";
import { decodeEntities, formatMoney } from "@/lib/format";

/** A garment cut out of the product's own photo (transparent WebP in /public/rail). */
export type Garment = { src: string; w: number; h: number };

/** The product fields this section needs (kept small: it is sent to the browser). */
export type RailProduct = {
  id: number;
  name: string;
  slug: string;
  on_sale: boolean;
  prices: WCPrices;
  front: Garment;
  /** Second photo of the same garment (often the back), cut out the same way. */
  back?: Garment;
};

type Mode = "rack" | "show";

const STEP_MS = 2800; // time each piece faces front before the rail moves on
const MOVE = "900ms cubic-bezier(.65,0,.35,1)";
const SIDE_ANGLE = 64; // how far the pieces on the rail are turned away (degrees)

const mod = (a: number, n: number) => ((a % n) + n) % n;

/** All sizes come from the width of the stage, so every screen gets a balanced rail. */
function geometry(cw: number) {
  const W = cw < 400 ? 150 : cw < 640 ? 176 : cw < 1024 ? 206 : cw < 1280 ? 230 : 250; // front-facing card width
  const H = Math.round(W * 1.5); // garment area under the hanger
  const gap = Math.round(W * (cw < 640 ? 0.3 : 0.32)); // spacing of the turned pieces
  const near = Math.round(W * 0.86); // centre-to-centre distance next to the front piece
  const spread = near - gap;
  const Ws = Math.round(Math.min(W * 1.16, cw * 0.62)); // close-up width
  const scale = Ws / W;
  const hangerH = Math.round((W * 0.74 * 44) / 120);
  const railW = Math.min(cw - 24, 1180);
  const half = railW / 2;
  // The front card's top hangs from the rail; stage height fits the close-up plus room for its shadow.
  const stageH = Math.round(8 + (hangerH + H) * scale + 8);
  return { W, H, gap, near, spread, Ws, scale, hangerH, railW, half, stageH };
}

export function ShowroomRail({ products, ticker }: { products: RailProduct[]; ticker: string[] }) {
  const n = products.length;
  const stageRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [cw, setCw] = useState<number | null>(null);
  const g = useMemo(() => geometry(cw ?? 1280), [cw]);

  const [offset, setOffset] = useState(0); // which product sits in the middle of the rail
  const [hover, setHover] = useState<number | null>(null); // rail slot (relative) the pointer is turning
  const [mode, setMode] = useState<Mode>("rack");
  const [back, setBack] = useState(false);

  // Autoplay conditions
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  // null = follow the device (moves unless reduced motion is on); otherwise the visitor's own choice.
  const [userChoice, setUserChoice] = useState<"play" | "pause" | null>(null);
  const [focusInside, setFocusInside] = useState(false);
  const [reduce, setReduce] = useState(false);
  const [tick, setTick] = useState(0);
  const lastTouch = useRef(0);
  const pointerType = useRef<string>("mouse");
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  // Measure the stage, watch visibility, read the reduced-motion setting.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setCw(Math.round(e.contentRect.width)));
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    const onVis = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMq = () => setReduce(mq.matches);
    onMq();
    mq.addEventListener("change", onMq);
    return () => {
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      mq.removeEventListener("change", onMq);
    };
  }, []);

  const autoplayOn = userChoice ? userChoice === "play" : !reduce;
  const running =
    n > 1 && cw !== null && inView && pageVisible && autoplayOn && hover === null && !focusInside && mode === "rack";

  // Endless loop: every few seconds the rail moves one piece along. Products are taken from the
  // list in a circle (offset grows forever, product = offset mod n), so there is never a reset.
  useEffect(() => {
    if (!running) return;
    const id = window.setTimeout(() => {
      if (Date.now() - lastTouch.current < 5000) setTick((t) => t + 1); // a recent swipe/tap: wait a little longer
      else {
        setHover(null);
        setOffset((o) => o + 1);
      }
    }, STEP_MS);
    return () => window.clearTimeout(id);
  }, [running, offset, tick]);

  const step = useCallback((dir: number) => {
    lastTouch.current = Date.now();
    setHover(null);
    setBack(false);
    setOffset((o) => o + dir);
  }, []);

  const open = (v: number) => {
    setHover(null);
    setBack(false);
    setOffset(v);
    setMode("show");
  };
  const close = useCallback(() => {
    setBack(false);
    setMode("rack");
    lastTouch.current = Date.now();
    requestAnimationFrame(() =>
      stageRef.current?.querySelector<HTMLElement>('[data-front="true"]')?.focus({ preventScroll: true }),
    );
  }, []);

  // Close-up: focus Close, and Escape / arrow keys work anywhere on the page.
  useEffect(() => {
    if (mode !== "show") return;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mode, close, step]);

  if (n === 0) return null;

  // Which rail slots exist: enough to fill the rail, plus one hidden slot at each end so a piece
  // is always added and removed out of sight. Never more slots than products (no doubles on show).
  const turned = mode === "show" ? 0 : (hover ?? 0);
  const visibleSlots = Math.max(1, Math.floor((g.half - g.W * 0.2 - g.spread) / g.gap));
  const r = Math.max(1, Math.min(visibleSlots + 2, Math.floor((n - 1) / 2)));

  function place(d: number) {
    if (mode === "show") {
      if (d === 0) return { x: 0, rot: 0, scale: g.scale, op: 1, blur: 0, z: 100, shade: 0 };
      const s = Math.sign(d);
      const x = s * (g.Ws / 2 + g.W * 0.3 + (Math.abs(d) - 1) * g.gap);
      return { x, rot: -s * SIDE_ANGLE, scale: 1, op: Math.abs(d) === 1 ? 0.5 : 0, blur: 3, z: 90 - Math.abs(d), shade: 0.12 };
    }
    const rel = d - turned;
    // The turned piece stays exactly where it hangs on the resting rail (so it stays under the
    // pointer); the pieces around it slide to make room.
    const shift = turned === 0 ? 0 : Math.sign(turned) * g.spread;
    const x = d * g.gap + (rel > 0 ? g.spread : rel < 0 ? -g.spread : 0) + shift;
    const inside = Math.abs(x) < g.half - g.W * 0.2;
    return {
      x,
      rot: rel === 0 ? 0 : rel < 0 ? SIDE_ANGLE : -SIDE_ANGLE,
      scale: rel === 0 ? 1.08 : 1, // the piece facing front stands out a little
      op: inside ? 1 : 0,
      blur: 0,
      z: 100 - Math.abs(rel),
      shade: rel === 0 ? 0 : 0.1,
    };
  }

  const current = products[mod(offset + turned, n)];
  const currentName = decodeEntities(current.name);
  const priceText =
    current.prices.price_range && current.prices.price_range.min_amount !== current.prices.price_range.max_amount
      ? `${formatMoney(current.prices.price_range.min_amount, current.prices)} – ${formatMoney(current.prices.price_range.max_amount, current.prices)}`
      : formatMoney(current.prices.price, current.prices);
  const hasBack = mode === "show" && !!current.back;

  const slots = [];
  for (let d = -r; d <= r; d++) slots.push(d);

  return (
    <section className="relative overflow-hidden border-t border-white/70 bg-card/40" aria-labelledby="rail-h">
      <div className="mx-auto max-w-[1440px] px-5 pt-20 text-center md:px-8">
        <p className="text-[13px] font-semibold uppercase tracking-[0.25em] text-primary-hover">On the Rail</p>
        <h2 id="rail-h" className="mt-4 text-[34px] md:text-[44px]">Fresh Off the Rail.</h2>
        <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-foreground/75">
          Our newest pieces, hanging and ready. Hover to turn one around, or tap for a closer look.
        </p>
      </div>

      {/* STAGE */}
      <div
        ref={stageRef}
        role="region"
        aria-roledescription="carousel"
        aria-label="Newest pieces on the rail"
        className={`relative mt-10 touch-pan-y select-none transition-opacity duration-500 ${cw === null ? "opacity-0" : "opacity-100"}`}
        style={{ height: g.stageH }}
        onPointerLeave={() => setHover(null)}
        onPointerMove={(e) => {
          // Mouse: which piece the pointer is over, measured on the resting rail, so turning a
          // piece never moves another one under the pointer (no flicker between two pieces).
          if (e.pointerType !== "mouse" || mode !== "rack") return;
          const box = e.currentTarget.getBoundingClientRect();
          const px = e.clientX - box.left - box.width / 2;
          const py = e.clientY - box.top;
          let best: number | null = null;
          if (py > 8 && py < 8 + g.hangerH + g.H) {
            let dist = Infinity;
            for (let d = -r; d <= r; d++) {
              const rest = d * g.gap + (d > 0 ? g.spread : d < 0 ? -g.spread : 0);
              if (Math.abs(rest) >= g.half - g.W * 0.2) continue;
              const dd = Math.abs(px - rest);
              if (dd < dist) {
                dist = dd;
                best = d;
              }
            }
            if (dist > g.W * 0.6) best = null;
          }
          setHover((h) => (h === best ? h : best));
        }}
        onPointerDown={(e) => {
          pointerType.current = e.pointerType;
          swiped.current = false;
          if (e.pointerType !== "mouse") swipe.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          const s = swipe.current;
          swipe.current = null;
          if (!s) return;
          const dx = e.clientX - s.x;
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - s.y)) {
            swiped.current = true;
            step(dx < 0 ? Math.min(3, Math.max(1, Math.round(-dx / g.gap))) : -Math.min(3, Math.max(1, Math.round(dx / g.gap))));
          }
        }}
        onFocus={() => setFocusInside(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusInside(false);
        }}
        onKeyDown={(e) => {
          if (mode !== "rack") return;
          if (e.key === "ArrowRight") {
            e.preventDefault();
            step(1);
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            step(-1);
          }
        }}
      >
        {/* The rail */}
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-[6px] -translate-x-1/2" style={{ width: g.railW }}>
          <div className="h-[6px] rounded-full bg-[linear-gradient(180deg,var(--white)_0%,var(--muted-text)_55%,var(--heading-color)_100%)] opacity-80 shadow-[0_6px_10px_-6px_rgba(34,32,29,.6)]" />
          <span className="absolute -left-1 -top-[5px] size-4 rounded-full border border-white/70 bg-[radial-gradient(circle_at_35%_35%,var(--white),var(--muted-text))]" />
          <span className="absolute -right-1 -top-[5px] size-4 rounded-full border border-white/70 bg-[radial-gradient(circle_at_35%_35%,var(--white),var(--muted-text))]" />
        </div>

        {/* The pieces */}
        {slots.map((d) => {
          const v = offset + d;
          const p = products[mod(v, n)];
          const pl = place(d);
          const isFront = d === turned;
          const name = decodeEntities(p.name);
          const showBack = isFront && mode === "show" && back && !!p.back;
          // Hanger sized to the garment's shoulders; the garment hangs over it (hook shows above the neckline).
          const shown = Math.min(g.W, g.H * (p.front.w / p.front.h));
          const hangerW = Math.max(g.W * 0.42, Math.min(g.W * 0.74, shown * 0.82));
          const hangerH = (hangerW * 44) / 120;
          return (
            <Link
              key={v}
              href={`/product/${p.slug}`}
              prefetch={false}
              draggable={false}
              data-front={isFront ? "true" : undefined}
              tabIndex={pl.op > 0 ? 0 : -1}
              aria-hidden={pl.op > 0 ? undefined : true}
              aria-label={mode === "show" && isFront ? `${name} — view product` : name}
              className="absolute left-1/2 top-[2px] block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
              style={{
                width: g.W,
                zIndex: pl.z,
                opacity: pl.op,
                filter: pl.blur ? `blur(${pl.blur}px)` : undefined,
                pointerEvents: pl.op > 0 ? undefined : "none",
                transform: `translate3d(${Math.round(pl.x - g.W / 2)}px,0,0)`,
                transition: `transform ${MOVE}, opacity 600ms ease, filter 600ms ease`,
              }}
              onFocus={() => mode === "rack" && setHover(d)}
              onClick={(e) => {
                if (swiped.current) {
                  e.preventDefault();
                  swiped.current = false;
                  return;
                }
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                if (mode === "show") {
                  if (d === 0) return; // the close-up piece opens its product page
                  e.preventDefault();
                  step(d);
                  return;
                }
                e.preventDefault();
                if (pointerType.current === "touch" && d !== 0) {
                  // Touch: first tap brings the piece to the front, the next one opens it.
                  step(d);
                  return;
                }
                open(v);
              }}
            >
              <div
                className="relative"
                style={{
                  transform: `perspective(1100px) rotateY(${pl.rot}deg) scale(${pl.scale})`,
                  transformOrigin: "50% 0",
                  transition: `transform ${MOVE}`,
                }}
              >
                <div style={{ height: g.hangerH }} className="relative">
                  <Hanger width={hangerW} height={hangerH} />
                </div>
                <div style={{ marginTop: -(g.hangerH - hangerH * 0.52) }} className="relative z-10">
                  <div className="relative [perspective:1400px]" style={{ height: g.H }}>
                    <div
                      className="relative size-full [transform-style:preserve-3d]"
                      style={{ transform: showBack ? "rotateY(180deg)" : undefined, transition: "transform 900ms cubic-bezier(.65,0,.35,1)" }}
                    >
                      <Face garment={p.front} alt={name} shade={pl.shade} eager={Math.abs(d) <= 2} />
                      {p.back && isFront && mode === "show" && <Face garment={p.back} alt={`${name} — another view`} shade={0} back />}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}

        {/* Close-up controls */}
        {mode === "show" && (
          <>
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              className="glass-chip absolute right-4 top-4 z-[120] inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.18em] transition-colors hover:border-primary hover:text-primary-hover md:right-8"
            >
              Close <X className="size-4" strokeWidth={1.5} />
            </button>
            <RoundArrow side="left" onClick={() => step(-1)} />
            <RoundArrow side="right" onClick={() => step(1)} />
          </>
        )}
      </div>

      {/* CAPTION */}
      {/* No visible title or price here (product pages show them); the buttons carry the product. */}
      <div className="mx-auto flex max-w-[1440px] flex-col items-center px-5 pb-14 pt-2 text-center md:px-8">
        <div className="flex min-h-[52px] flex-wrap items-center justify-center gap-3">
          {mode === "rack" ? (
            <>
              <button
                type="button"
                onClick={() => open(offset + turned)}
                aria-label={`Take a closer look at ${currentName}`}
                className="inline-flex items-center rounded-full bg-heading px-7 py-3.5 text-[13px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-primary hover:text-heading"
              >
                Take a closer look
              </button>
              <button
                type="button"
                onClick={() => setUserChoice(autoplayOn ? "pause" : "play")}
                aria-label={autoplayOn ? "Pause the rail" : "Play the rail"}
                className="glass-chip grid size-12 place-items-center rounded-full transition-colors hover:border-primary hover:text-primary-hover"
              >
                {!autoplayOn ? <Play className="size-4" strokeWidth={1.5} /> : <Pause className="size-4" strokeWidth={1.5} />}
              </button>
            </>
          ) : (
            <>
              {hasBack && (
                <div className="glass-chip inline-flex rounded-full p-1" role="group" aria-label="Photo">
                  <button
                    type="button"
                    aria-pressed={!back}
                    onClick={() => setBack(false)}
                    className={`rounded-full px-5 py-2 text-[12px] font-semibold uppercase tracking-[0.14em] transition ${!back ? "bg-heading text-white" : "hover:text-primary-hover"}`}
                  >
                    Front
                  </button>
                  <button
                    type="button"
                    aria-pressed={back}
                    onClick={() => setBack(true)}
                    className={`rounded-full px-5 py-2 text-[12px] font-semibold uppercase tracking-[0.14em] transition ${back ? "bg-heading text-white" : "hover:text-primary-hover"}`}
                  >
                    Turn
                  </button>
                </div>
              )}
              <Link
                href={`/product/${current.slug}`}
                prefetch={false}
                aria-label={`See sizes and availability for ${currentName}`}
                className="inline-flex items-center gap-1.5 border-b border-heading/40 pb-0.5 text-[12px] font-semibold uppercase tracking-[0.18em] transition-colors hover:border-primary hover:text-primary-hover"
              >
                See sizes &amp; availability <ArrowUpRight className="size-4" strokeWidth={1.5} />
              </Link>
            </>
          )}
        </div>
        <p className="sr-only" aria-live={running ? "off" : "polite"}>
          {currentName}, {priceText}
        </p>
      </div>

      {/* TICKER — a seamless loop: the text is there twice and the strip moves exactly one copy's width. */}
      {ticker.length > 0 && (
        <div className="overflow-hidden border-y border-heading/10 bg-primary py-2.5" aria-hidden>
          <div className="flex w-max animate-[marquee_32s_linear_infinite] whitespace-nowrap">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex">
                {[...ticker, ...ticker].map((t, i) => (
                  <span key={i} className="flex items-center text-[12px] font-semibold uppercase tracking-[0.22em] text-heading">
                    <span className="px-5">{t}</span>
                    <span className="opacity-60">•</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/** A clothes hanger: hook over the rail, shoulders resting on the card. */
function Hanger({ width, height }: { width: number; height: number }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 120 44"
      width={width * 0.74}
      height={height}
      className="pointer-events-none absolute left-1/2 top-0 block -translate-x-1/2 text-heading"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M60 22 V16 C60 12 66 11 66 6 C66 2.5 63 1 60 1 C57 1 54.5 3 54.5 5.5" strokeWidth="2.2" />
      <path d="M60 21 L9 39 Q4 41.5 9 42.5 H111 Q116 41.5 111 39 Z" strokeWidth="2.4" />
    </svg>
  );
}

/** One side of a garment: the cut-out photo, hanging from the top, with a shadow that follows its shape. */
function Face({ garment, alt, shade, back = false, eager = false }: { garment: Garment; alt: string; shade: number; back?: boolean; eager?: boolean }) {
  return (
    <div className="absolute inset-0 [backface-visibility:hidden]" style={back ? { transform: "rotateY(180deg)" } : undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={garment.src}
        width={garment.w}
        height={garment.h}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        className="absolute inset-0 size-full object-contain object-top"
        style={{
          filter: `drop-shadow(14px 22px 16px rgba(34,32,29,.22)) brightness(${1 - shade})`,
          transition: "filter 600ms ease",
        }}
      />
    </div>
  );
}

function RoundArrow({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ArrowLeft : ArrowRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous piece" : "Next piece"}
      className={`absolute top-1/2 z-[120] grid size-11 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-white/70 shadow-[0_10px_24px_-12px_rgba(34,32,29,.5)] backdrop-blur-md transition hover:bg-primary md:size-12 ${
        side === "left" ? "left-3 md:left-[8%]" : "right-3 md:right-[8%]"
      }`}
    >
      <Icon className="size-5" strokeWidth={1.5} />
    </button>
  );
}

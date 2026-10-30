"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, X } from "lucide-react";
import type { SizeTab } from "@/lib/guides";

type Img = { src: string; alt: string } | null;

/* Same classes as the rest of the homepage: hero eyebrow, "Shop Now" pill button, Tabs pills. */
const eyebrow = "text-[13px] font-semibold uppercase tracking-[0.25em] text-primary-hover";
const pillButton =
  "inline-flex items-center rounded-full bg-heading px-8 py-4 text-[14px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-primary hover:text-heading";

const STEPS = [
  { n: "01", title: "Start With the Fit", text: "Choose pieces that feel comfortable and suit your preferred silhouette." },
  { n: "02", title: "Keep It Simple", text: "Pair statement pieces with versatile wardrobe essentials." },
  { n: "03", title: "Make It Your Own", text: "Choose colors and accessories that reflect your personal style." },
];

/**
 * Homepage "Fit & Style Guide": two image cards, each opening a guide in a drawer from the right.
 * Uses the site's existing glass surfaces, colours, type and buttons only.
 */
export function FitStyleGuide({ sizeTabs, images }: { sizeTabs: SizeTab[]; images: { size: Img; style: Img; drawer: Img } }) {
  const [open, setOpen] = useState<"size" | "style" | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);

  const show = (which: "size" | "style", el: HTMLButtonElement) => {
    trigger.current = el;
    setOpen(which);
  };
  const close = useCallback(() => setOpen(null), []);
  // After a guide closes (and its panel is inert), return focus to the button that opened it.
  useEffect(() => {
    if (open === null && trigger.current) {
      trigger.current.focus();
      trigger.current = null;
    }
  }, [open]);

  const cards = [
    {
      key: "size" as const,
      label: "01 — Find Your Fit",
      title: "Your Size, Made Simple.",
      text: "Find the right fit with our easy women’s sizing guide.",
      button: "View Size Guide",
      img: images.size,
    },
    {
      key: "style" as const,
      label: "02 — The Style Guide",
      title: "Find Your Favorite Look.",
      text: "Simple styling ideas for everyday outfits.",
      button: "Explore Style Guide",
      img: images.style,
    },
  ];

  return (
    <section className="mx-auto max-w-[1440px] px-5 py-20 md:px-8" aria-labelledby="fit-guide-h">
      <div className="text-center">
        <p className={eyebrow}>Fit &amp; Style Guide</p>
        <h2 id="fit-guide-h" className="mt-4 text-[34px] md:text-[44px]">Find Your Perfect Fit.</h2>
        <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-foreground/75">
          Discover simple guides to finding your size and styling the pieces you love.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {cards.map((c) => (
          <article key={c.key} className="group glass-card glass-lift flex flex-col rounded-3xl p-2.5">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-card">
              {c.img && (
                <Image
                  src={c.img.src}
                  alt={c.img.alt}
                  fill
                  sizes="(min-width:1440px) 690px, (min-width:768px) 48vw, 100vw"
                  quality={80}
                  className="object-cover object-[50%_20%] transition duration-700 group-hover:scale-105"
                />
              )}
            </div>
            <div className="flex flex-1 flex-col items-start px-3 pb-4 pt-6 sm:px-5 sm:pb-5">
              <p className={eyebrow}>{c.label}</p>
              <h3 className="mt-3 text-[26px] leading-tight md:text-[30px]">{c.title}</h3>
              <p className="mt-2 text-[16px] leading-relaxed text-foreground/75">{c.text}</p>
              <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={open === c.key}
                onClick={(e) => show(c.key, e.currentTarget)}
                className={`${pillButton} mt-6`}
              >
                {c.button}
              </button>
            </div>
          </article>
        ))}
      </div>

      <Drawer open={open === "size"} onClose={close} title="Women’s Size Guide" description="Find the right size for your favorite pieces.">
        <SizeGuide tabs={sizeTabs} />
      </Drawer>
      <Drawer open={open === "style"} onClose={close} title="The Women’s Style Guide" description="Simple ways to style the pieces you love.">
        <StyleGuide image={images.drawer} />
      </Drawer>
    </section>
  );
}

/** Right-side drawer: glass panel, blurred backdrop, Escape / backdrop click to close, focus kept inside. */
function Drawer({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    Promise.resolve().then(() => setMounted(true));
  }, []);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      // Keep keyboard focus inside the drawer.
      const items = [...panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(
        (el) => el.offsetParent !== null,
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!mounted) return null;
  const titleId = `drawer-${title.replace(/\W+/g, "-").toLowerCase()}`;
  return createPortal(
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-[70] bg-heading/35 backdrop-blur-[3px] transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-hidden={!open}
        inert={!open}
        className={`glass fixed inset-y-0 right-0 z-[71] flex w-full max-w-[480px] flex-col rounded-l-3xl border-r-0 !shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="glass-divider flex items-start justify-between gap-4 border-b px-6 pb-5 pt-6 sm:px-8">
          <div>
            <h2 id={titleId} className="text-[28px] leading-tight">{title}</h2>
            <p className="mt-1.5 text-[15px] text-foreground/75">{description}</p>
          </div>
          <button ref={closeBtn} type="button" onClick={onClose} aria-label="Close guide" className="icon-glass -mr-2 shrink-0">
            <X className="size-6" strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">{children}</div>
      </div>
    </>,
    document.body,
  );
}

function SizeGuide({ tabs }: { tabs: SizeTab[] }) {
  const all = [...tabs.map((t) => ({ key: t.key, label: t.label })), { key: "conversion", label: "Size Conversion" }];
  const [active, setActive] = useState(all[0].key);
  const tab = tabs.find((t) => t.key === active);

  return (
    <div>
      {/* Same pill tabs as the homepage Best Sellers / New Arrivals switch */}
      <div role="tablist" aria-label="Size guide" className="glass-chip grid grid-cols-2 gap-1 rounded-3xl p-1.5">
        {all.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={active === t.key}
            onClick={() => setActive(t.key)}
            className={`rounded-full px-3 py-2 text-[14px] transition-all ${
              active === t.key ? "bg-white shadow-[0_6px_16px_-8px_rgba(34,32,29,.4)]" : "text-foreground/70 hover:bg-white/50 hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="mt-6 animate-[fadein_.4s_ease]">
        {tab ? (
          <>
            <p className="text-[15px] leading-relaxed text-foreground/80">
              These are the sizes our newest {tab.label.toLowerCase()} come in. Each product page shows the exact sizes for that style.
            </p>
            <div className="glass-card mt-5 overflow-x-auto rounded-2xl">
              <table className="w-full text-left text-[15px]">
                <thead>
                  <tr className="glass-divider border-b text-[12px] uppercase tracking-[0.14em] text-foreground/70">
                    <th scope="col" className="px-4 py-3 font-semibold">Size</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Also shown as</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Available in</th>
                  </tr>
                </thead>
                <tbody>
                  {tab.rows.map((r) => (
                    <tr key={r.size} className="glass-divider border-b last:border-b-0">
                      <th scope="row" className="px-4 py-3 font-semibold">{r.size}</th>
                      <td className="px-4 py-3 text-foreground/80">{r.alsoShownAs ?? "—"}</td>
                      <td className="px-4 py-3 text-foreground/80">{r.share >= 0.8 ? "Most styles" : r.share >= 0.3 ? "Many styles" : "Some styles"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="mt-6 space-y-2.5 text-[15px] leading-relaxed text-foreground/80">
              <li>• Check the size options on the product page before you order — they can differ between styles.</li>
              <li>• Between two sizes? Read the product description for how that piece fits.</li>
            </ul>
            <Link href={tab.shopHref} className="group mt-6 inline-flex items-center gap-2 text-[14px] font-semibold uppercase tracking-[0.12em] hover:text-primary-hover">
              Shop {tab.label} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </>
        ) : active === "conversion" ? (
          <>
            <p className="text-[15px] leading-relaxed text-foreground/80">
              Our pieces use letter sizes. Some styles write the larger sizes with numbers instead — they are the same size:
            </p>
            <div className="glass-card mt-5 overflow-x-auto rounded-2xl">
              <table className="w-full text-left text-[15px]">
                <thead>
                  <tr className="glass-divider border-b text-[12px] uppercase tracking-[0.14em] text-foreground/70">
                    <th scope="col" className="px-4 py-3 font-semibold">Letter size</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Same as</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["XXL", "2XL"],
                    ["XXXL", "3XL"],
                    ["XXXXL", "4XL"],
                  ].map(([a, b]) => (
                    <tr key={a} className="glass-divider border-b last:border-b-0">
                      <th scope="row" className="px-4 py-3 font-semibold">{a}</th>
                      <td className="px-4 py-3 text-foreground/80">{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-5 text-[15px] leading-relaxed text-foreground/80">
              “One Size” pieces are made to fit a range of sizes. Numbered sizes (such as 8 or 10) differ between brands, so use the
              product details to compare.
            </p>
          </>
        ) : (
          <p className="text-[15px] text-foreground/80">Size details are loading. Please check each product page for its sizes.</p>
        )}
      </div>

      <p className="glass-chip mt-8 rounded-2xl px-4 py-3 text-[14px] text-foreground/80">
        Sizes may vary by brand and style. Please check the product details before ordering.
      </p>
    </div>
  );
}

function StyleGuide({ image }: { image: Img }) {
  return (
    <div>
      {image && (
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-card shadow-[0_24px_50px_-30px_rgba(34,32,29,.55)] ring-1 ring-white/80">
          <Image src={image.src} alt={image.alt} fill sizes="440px" quality={80} className="object-cover object-top" />
        </div>
      )}
      <ol className="mt-7 space-y-6">
        {STEPS.map((s) => (
          <li key={s.n} className="flex gap-4">
            <span className="glass-chip grid size-10 shrink-0 place-items-center rounded-full text-[13px] font-semibold text-primary-hover">{s.n}</span>
            <div>
              <h3 className="text-[20px] leading-snug">{s.title}</h3>
              <p className="mt-1 text-[15px] leading-relaxed text-foreground/80">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <Link href="/shop" className={`${pillButton} mt-8`}>
        Shop the Collection
      </Link>
    </div>
  );
}

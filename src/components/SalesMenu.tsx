/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { SalesMenuData } from "@/lib/mega";

/** Desktop "Today's Sales" mega menu: Shop By (left) · Today's Sales (right). */
export function SalesMenu({ data, onNavigate }: { data: SalesMenuData | null; onNavigate: () => void }) {
  return (
    // Left half white, right half the brand card colour, edge to edge.
    <div
      className="bg-[linear-gradient(to_right,var(--white)_50%,var(--card-background)_50%)]"
      onClick={(e) => (e.target as HTMLElement).closest("a") && onNavigate()}
    >
      <div className="mx-auto grid max-h-[calc(100vh-110px)] max-w-[1440px] grid-cols-2 overflow-y-auto">
        {/* Shop By */}
        <section className="bg-white px-8 py-8 xl:px-12" aria-labelledby="shopby-h">
          <h2 id="shopby-h" className="text-center text-[28px]">Shop By</h2>
          {data ? (
            <ul className="mt-7 grid grid-cols-4 gap-x-4 gap-y-7">
              {data.categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/shop?category=${c.slug}`} className="group/cat flex flex-col items-center text-center">
                    <span className="block aspect-square w-full max-w-[150px] overflow-hidden rounded-full border-4 border-card bg-card transition group-hover/cat:border-secondary">
                      {c.image && (
                        <img src={c.image} alt="" loading="lazy" className="size-full object-cover object-top transition duration-500 group-hover/cat:scale-105" />
                      )}
                    </span>
                    <span className="mt-3 text-[16px] leading-snug group-hover/cat:text-primary-hover">{c.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Skeleton kind="circles" />
          )}
        </section>

        {/* Today's Sales */}
        <section className="bg-card px-8 py-8 xl:px-12" aria-labelledby="sales-h">
          <div className="relative">
            <h2 id="sales-h" className="text-center text-[28px]">Today&apos;s Sales</h2>
            <Link href="/todays-sales" className="absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-1 text-[13px] font-semibold uppercase tracking-[0.12em] hover:text-primary-hover">
              View all <ArrowRight className="size-4" strokeWidth={1.75} />
            </Link>
          </div>
          {data ? (
            data.products.length ? (
              <ul className="mt-7 grid grid-cols-2 gap-4">
                {data.products.map((p) => (
                  <li key={p.slug}>
                    <Link href={`/product/${p.slug}`} className="group/p flex h-full gap-4 bg-white p-4 transition hover:shadow-md">
                      <span className="aspect-[4/5] w-24 shrink-0 overflow-hidden bg-background xl:w-28">
                        {p.image && <img src={p.image} alt="" loading="lazy" className="size-full object-cover object-top" />}
                      </span>
                      <span className="min-w-0 flex-1 py-1">
                        <span className="line-clamp-3 text-[15px] leading-snug group-hover/p:text-primary-hover">{p.name}</span>
                        <span className="mt-2 flex flex-wrap items-baseline gap-x-2 text-[16px]">
                          {p.regular && (
                            <span className="text-muted line-through">
                              <span className="sr-only">Was </span>
                              {p.regular}
                            </span>
                          )}
                          <span className="font-semibold text-primary-hover">
                            {p.regular && <span className="sr-only">Now </span>}
                            {p.price}
                          </span>
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-10 text-center text-muted">No sale items right now — check back soon.</p>
            )
          ) : (
            <Skeleton kind="cards" />
          )}
        </section>
      </div>
    </div>
  );
}

/** Compact version for the mobile/tablet menu drawer. */
export function SalesMenuCompact({ data, onNavigate }: { data: SalesMenuData | null; onNavigate: () => void }) {
  if (!data) return <p className="py-4 text-sm text-muted">Loading…</p>;
  return (
    <div className="pb-4 pt-2 text-base" onClick={(e) => (e.target as HTMLElement).closest("a") && onNavigate()}>
      <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-foreground/70">Shop by</p>
      <ul className="mt-3 grid grid-cols-4 gap-3">
        {data.categories.map((c) => (
          <li key={c.slug}>
            <Link href={`/shop?category=${c.slug}`} className="flex flex-col items-center text-center">
              <span className="block aspect-square w-full overflow-hidden rounded-full border-2 border-card bg-card">
                {c.image && <img src={c.image} alt="" loading="lazy" className="size-full object-cover object-top" />}
              </span>
              <span className="mt-1.5 line-clamp-2 text-[12px] leading-tight">{c.name}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-[13px] font-semibold uppercase tracking-[0.14em] text-foreground/70">Today&apos;s Sales</p>
      <ul className="mt-3 space-y-2">
        {data.products.map((p) => (
          <li key={p.slug}>
            <Link href={`/product/${p.slug}`} className="flex items-center gap-3 rounded-md bg-card p-2">
              <span className="aspect-[4/5] w-12 shrink-0 overflow-hidden bg-background">
                {p.image && <img src={p.image} alt="" loading="lazy" className="size-full object-cover object-top" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-[14px] leading-snug">{p.name}</span>
                <span className="mt-0.5 flex flex-wrap gap-x-2 text-[14px]">
                  {p.regular && <span className="text-muted line-through">{p.regular}</span>}
                  <span className="font-semibold text-primary-hover">{p.price}</span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/todays-sales" className="mt-4 flex items-center gap-1 text-[15px] font-semibold">
        View all sale items <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}

function Skeleton({ kind }: { kind: "circles" | "cards" }) {
  return kind === "circles" ? (
    <div className="mt-7 grid animate-pulse grid-cols-4 gap-x-4 gap-y-7" aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className="aspect-square w-full max-w-[150px] rounded-full bg-card" />
          <div className="mt-3 h-4 w-20 rounded bg-card" />
        </div>
      ))}
    </div>
  ) : (
    <div className="mt-7 grid animate-pulse grid-cols-2 gap-4" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-36 bg-white/70" />
      ))}
    </div>
  );
}

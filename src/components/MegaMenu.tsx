/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { MegaMenuData } from "@/lib/mega";

const label = "text-[13px] font-semibold uppercase tracking-[0.14em] text-foreground/70";

/** Full-width SHOP mega menu content (desktop). */
export function MegaMenu({ data, onNavigate }: { data: MegaMenuData; onNavigate: () => void }) {
  return (
    <div className="mx-auto max-h-[calc(100vh-110px)] max-w-[1440px] overflow-y-auto px-8 py-7" onClick={(e) => (e.target as HTMLElement).closest("a") && onNavigate()}>
      {/* Shop by category */}
      <div className="flex items-center justify-between">
        <p className={label}>Shop by category</p>
        <Link href="/shop" className={`${label} group/all flex items-center gap-1.5 text-foreground hover:text-primary-hover`}>
          Shop all <ArrowRight className="size-4 transition-transform group-hover/all:translate-x-0.5" strokeWidth={1.75} />
        </Link>
      </div>
      <ul className="mt-4 grid grid-cols-5 gap-5">
        {data.categories.map((c) => (
          <li key={c.slug} className="group/card overflow-hidden rounded-lg border border-line bg-background transition hover:border-primary/60 hover:shadow-md">
            <Link href={`/shop?category=${c.slug}`} className="block">
              <span className="block aspect-[4/3] overflow-hidden bg-card">
                {c.image && (
                  <img src={c.image} alt="" loading="lazy" className="size-full object-cover object-top transition duration-700 group-hover/card:scale-105" />
                )}
              </span>
              <span className="block px-4 pt-4">
                <span className="font-display block text-[21px] leading-tight">{c.name}</span>
                <span className="mt-1 block text-[13px] text-muted">{c.count.toLocaleString("en-US")} pieces</span>
              </span>
            </Link>
            <div className="flex min-h-[44px] flex-wrap gap-1.5 px-4 pb-4 pt-3">
              {c.children.map((ch) => (
                <Link key={ch.slug} href={`/shop?category=${ch.slug}`} className="rounded-full border border-line px-2.5 py-1 text-[12px] hover:border-primary hover:text-primary-hover">
                  {ch.name}
                </Link>
              ))}
            </div>
          </li>
        ))}
      </ul>

      <hr className="my-7 border-line" />

      {/* Collections · From the collection · Feature */}
      <div className="grid grid-cols-[1fr_1.7fr_1.35fr] gap-8">
        <div>
          <p className={label}>Collections</p>
          <ul className="mt-4 space-y-3 text-[15px]">
            {data.collections.map((c) => (
              <li key={c.slug}>
                <Link href={`/shop?category=${c.slug}`} className="hover:text-primary-hover">
                  {c.name} <span className="ml-1 text-[13px] text-muted">{c.count.toLocaleString("en-US")} pieces</span>
                </Link>
              </li>
            ))}
            <li>
              <Link href="/shop" className="hover:text-primary-hover">The full collection</Link>
            </li>
          </ul>
        </div>

        <div>
          <p className={label}>From the collection</p>
          <ul className="mt-4 space-y-2.5">
            {data.products.map((p) => (
              <li key={p.slug}>
                <Link href={`/product/${p.slug}`} className="group/row flex items-center gap-3 rounded-md bg-card p-2 pr-4 transition hover:bg-secondary/50">
                  <span className="size-11 shrink-0 overflow-hidden rounded bg-background">
                    {p.image && <img src={p.image} alt="" loading="lazy" className="size-full object-cover object-top" />}
                  </span>
                  <span className="line-clamp-1 flex-1 text-[14px]">{p.name}</span>
                  <span className="shrink-0 text-[14px] text-foreground/80">{p.price}</span>
                  <ArrowRight className="size-4 shrink-0 transition-transform group-hover/row:translate-x-0.5" strokeWidth={1.75} />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {data.feature && (
          <FeatureCard feature={data.feature} />
        )}
      </div>
    </div>
  );
}

function FeatureCard({ feature }: { feature: NonNullable<MegaMenuData["feature"]> }) {
  const post = feature.kind === "post";
  const inner = (
    <>
      <span>
        <span className="block text-[12px] font-semibold uppercase tracking-[0.16em] text-primary">{post ? "From the journal" : "Just in"}</span>
        <span className="font-display mt-3 block text-[26px] leading-snug text-footer-text">
          {post ? feature.title : `${feature.name} — ${feature.count.toLocaleString("en-US")} pieces`}
        </span>
      </span>
      <span className="mt-8 flex items-center gap-2 text-[15px] font-semibold text-footer-text">
        {post ? "Read the article" : "Shop new arrivals"}
        <ArrowUpRight className="size-4 transition-transform group-hover/feat:-translate-y-0.5 group-hover/feat:translate-x-0.5" strokeWidth={1.75} />
      </span>
    </>
  );
  const cls = "group/feat flex min-h-[200px] flex-col justify-between rounded-lg bg-footer p-6";
  return post ? (
    <a href={feature.href} className={cls}>{inner}</a>
  ) : (
    <Link href={`/shop?category=${feature.slug}`} className={cls}>{inner}</Link>
  );
}

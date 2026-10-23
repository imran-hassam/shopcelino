/* eslint-disable @next/next/no-img-element */
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight } from "lucide-react";
import { getCategory, getProducts } from "@/lib/woo";
import { HOME_LOOKS, HOME_TABS, MENU_CATEGORIES, SITE } from "@/lib/config";
import { decodeEntities } from "@/lib/format";
import type { WCProduct } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";
import { Carousel } from "@/components/Carousel";
import { Tabs } from "@/components/Tabs";
import { Reveal } from "@/components/Reveal";

export default function Home() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}

function HomeSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="min-h-[600px] bg-footer md:min-h-[680px] lg:min-h-[min(78vh,720px)]" />
      <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-5 px-5 py-20 md:grid-cols-4 md:px-8">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-[3/4] rounded-xl bg-card" />)}
      </div>
    </div>
  );
}

async function HomeContent() {
  const [hero, sale, tabData, catTiles, looks] = await Promise.all([
    getProducts({ category: "featured", perPage: 6 }),
    getProducts({ onSale: true, perPage: 1 }),
    Promise.all(HOME_TABS.map((t) => getProducts({ category: t.slug, perPage: 10 }))),
    Promise.all(
      MENU_CATEGORIES.map(async (c) => {
        const { products, total } = await getProducts({ category: c.slug, perPage: 1 });
        return { ...c, product: products[0] as WCProduct | undefined, total };
      }),
    ),
    Promise.all(
      HOME_LOOKS.map(async (l) => {
        const [cat, list] = await Promise.all([getCategory(l.slug), getProducts({ category: l.slug, perPage: 1, orderby: "popularity" })]);
        return { ...l, cat, product: list.products[0] as WCProduct | undefined };
      }),
    ),
  ]);

  const saleCount = sale.total;
  // Hero collage: three real product photos from different categories (women, men, kids…).
  const heroPool = [
    ...["womens-dresses", "mens-formal-wear", "kids", "women-sleepwear", "womens-lingerie"].map(
      (slug) => catTiles.find((c) => c.slug === slug)?.product,
    ),
    ...hero.products,
    ...(tabData[0]?.products ?? []),
  ];
  const collage: WCProduct[] = [];
  for (const p of heroPool) {
    if (p?.images.length && collage.length < 3 && !collage.some((x) => x.id === p.id || x.images[0].src === p.images[0].src)) collage.push(p);
  }

  return (
    <>
      {/* HERO — text on the left, a collage of real product photos on the right */}
      <section className="relative isolate overflow-hidden bg-footer text-footer-text">
        {/* Soft brand-gold glow behind the collage */}
        <div aria-hidden className="pointer-events-none absolute -right-40 top-1/2 -z-10 size-[720px] -translate-y-1/2 rounded-full bg-primary/15 blur-3xl" />

        <div className="relative mx-auto grid max-w-[1440px] items-center gap-12 px-5 py-14 md:px-8 md:py-16 lg:min-h-[min(78vh,720px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16 lg:px-16 lg:py-20">
          <div className="order-2 max-w-[560px] animate-[fadein_.9s_ease] lg:order-1">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[13px] font-semibold uppercase tracking-[0.25em] text-secondary">Women · Men · Kids</p>
              {saleCount > 0 && (
                <Link href="/shop?sale=1" className="rounded-full border border-secondary/60 px-3 py-0.5 text-[13px] text-secondary transition hover:bg-secondary hover:text-heading">
                  Sale on now
                </Link>
              )}
            </div>
            <h1 className="mt-5 text-[42px] leading-[1.08] !text-footer-text sm:text-[54px] xl:text-[68px]">{SITE.tagline}</h1>
            <p className="mt-6 max-w-md text-[17px] leading-relaxed tracking-wide text-footer-text/85">
              Dresses, lingerie, sleepwear, men&apos;s tailoring and kids&apos; wear — all in one place.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 rounded-sm bg-white px-8 py-3.5 text-[14px] font-semibold uppercase tracking-[0.12em] text-heading transition hover:bg-primary"
              >
                Shop Now
              </Link>
              <Link
                href="/shop?category=new-arrival"
                className="group inline-flex items-center gap-2 text-[14px] font-semibold uppercase tracking-[0.12em] text-footer-text/90 hover:text-secondary"
              >
                New Arrivals <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          {collage.length > 0 && <HeroCollage products={collage} />}
        </div>
      </section>

      {/* CATEGORY STRIP */}
      <section className="border-b border-line bg-white">
        <div className="no-scrollbar relative mx-auto flex max-w-[1440px] gap-6 overflow-x-auto px-5 py-8 md:justify-between md:px-8">
          {catTiles.map((c) => (
            <Link key={c.slug} href={`/shop?category=${c.slug}`} className="group flex w-24 shrink-0 flex-col items-center gap-3 text-center">
              <span className="size-20 overflow-hidden rounded-full border border-line bg-card p-1 transition group-hover:border-primary">
                {c.product?.images[0] ? (
                  <img
                    src={c.product.images[0].thumbnail}
                    alt=""
                    loading="lazy"
                    className="size-full rounded-full object-cover object-top transition duration-500 group-hover:scale-110"
                  />
                ) : null}
              </span>
              <span className="text-[13px] leading-tight group-hover:text-primary-hover">{c.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* BEST SELLERS / NEW ARRIVALS */}
      <section className="mx-auto max-w-[1440px] px-5 py-20 md:px-8">
        <Reveal>
          <Tabs
            tabs={HOME_TABS.map((t, i) => ({
              label: t.label,
              content: tabData[i].products.length ? (
                <Carousel label={t.label}>
                  {tabData[i].products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </Carousel>
              ) : (
                <p className="text-center text-muted">Products are loading — please check back shortly.</p>
              ),
            }))}
          />
        </Reveal>
        <div className="mt-10 text-center">
          <Link href="/shop" className="inline-flex items-center gap-2 border-b border-heading pb-1 text-[15px] font-semibold hover:border-primary-hover hover:text-primary-hover">
            View all products <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      {/* MARQUEE */}
      <section className="overflow-hidden border-y border-line bg-accent py-6" aria-label={SITE.tagline}>
        <div className="flex w-max animate-marquee whitespace-nowrap" aria-hidden>
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="font-display flex items-center text-3xl md:text-[44px]">
              <span className="px-8">{SITE.tagline}</span>
              <span className="text-primary">★</span>
            </span>
          ))}
        </div>
      </section>

      {/* CHOOSE YOUR LOOK */}
      <section className="mx-auto max-w-[1440px] px-5 py-20 md:px-8">
        <Reveal>
          <h2 className="text-center text-[34px] md:text-[44px]">Choose Your Look</h2>
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {looks.map((l, i) => (
            <Reveal key={l.slug} delay={i * 120}>
              <Link
                href={`/shop?category=${l.slug}`}
                className="group relative flex h-[440px] flex-col overflow-hidden rounded-2xl bg-card md:h-[520px]"
              >
                {l.product?.images[0] && (
                  <img
                    src={l.product.images[0].src}
                    srcSet={l.product.images[0].srcset}
                    sizes="(min-width:768px) 33vw, 100vw"
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 size-full object-cover object-top transition duration-[1.2s] group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/30 to-transparent" />
                <div className="relative p-6">
                  <h3 className="text-2xl">{l.title}</h3>
                  {l.cat && <p className="mt-2 text-sm text-foreground/75">{l.cat.count} pieces</p>}
                </div>
                <span className="relative mt-auto m-6 w-fit rounded-full bg-heading px-5 py-2.5 text-sm font-semibold text-white transition group-hover:bg-primary group-hover:text-heading">
                  Shop {l.cat ? decodeEntities(l.cat.name) : "now"}
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FEATURED GRID */}
      {hero.products.length > 2 && (
        <section className="bg-card/60">
          <div className="mx-auto max-w-[1440px] px-5 py-20 md:px-8">
            <Reveal>
              <h2 className="text-center text-[34px] md:text-[44px]">Featured Pieces</h2>
            </Reveal>
            <div className="mt-12 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-6">
              {hero.products.slice(0, 6).map((p, i) => (
                <Reveal key={p.id} delay={(i % 6) * 80}>
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

/** Hero artwork: real product photos arranged as an editorial collage (one large, two staggered). */
function HeroCollage({ products }: { products: WCProduct[] }) {
  const [big, ...small] = products;
  const tile = (p: WCProduct, sizes: string, priority: boolean, cls: string) => (
    <Link
      key={p.id}
      href={`/product/${p.slug}`}
      className={`group relative block overflow-hidden rounded-sm bg-card shadow-2xl shadow-black/40 ring-1 ring-secondary/30 ${cls}`}
    >
      <Image
        src={p.images[0].src}
        alt={p.images[0].alt || decodeEntities(p.name)}
        fill
        sizes={sizes}
        quality={80}
        {...(priority ? { fetchPriority: "high" as const, loading: "eager" as const } : {})}
        className="object-cover object-top transition duration-700 group-hover:scale-105"
      />
      <span className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-footer/90 to-transparent px-4 pb-3 pt-8 text-[13px] leading-snug text-footer-text transition duration-300 group-hover:translate-y-0 group-focus-visible:translate-y-0">
        <span className="line-clamp-2">{decodeEntities(p.name)}</span>
      </span>
    </Link>
  );
  return (
    <div className="order-1 animate-[fadein_1.1s_ease] lg:order-2">
      <div className="relative mx-auto grid max-w-[640px] grid-cols-[1.25fr_1fr] gap-4 sm:gap-5">
        {/* Thin gold frame offset behind the large photo */}
        <div aria-hidden className="absolute -left-3 -top-3 hidden h-[78%] w-[52%] border border-primary/60 sm:block" />
        {tile(big, "(min-width:1024px) 30vw, 55vw", true, "row-span-2 min-h-[300px]")}
        {small[0] && tile(small[0], "(min-width:1024px) 22vw, 45vw", true, "aspect-square lg:translate-y-8")}
        {small[1] && tile(small[1], "(min-width:1024px) 22vw, 45vw", false, "aspect-square lg:translate-y-8")}
      </div>
    </div>
  );
}

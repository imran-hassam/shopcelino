/* eslint-disable @next/next/no-img-element */
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
import { Price } from "@/components/Price";

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
      <div className="h-[560px] bg-secondary/45" />
      <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-5 px-5 py-20 md:grid-cols-4 md:px-8">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-[3/4] rounded-xl bg-card" />)}
      </div>
    </div>
  );
}

async function HomeContent() {
  const [hero, tabData, catTiles, looks] = await Promise.all([
    getProducts({ category: "featured", perPage: 6 }),
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

  const heroProducts = hero.products.length ? hero.products : tabData[0]?.products ?? [];
  const heroMain = heroProducts.find((p) => p.images.length) ?? null;
  const heroSide = heroProducts.find((p) => p.id !== heroMain?.id && p.images.length) ?? null;

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-secondary/45">
        <div className="mx-auto grid max-w-[1440px] items-center gap-10 px-5 py-14 md:grid-cols-2 md:px-8 md:py-0">
          <div className="relative z-10 animate-[fadein_.9s_ease] md:py-28">
            <p className="mb-5 text-sm font-semibold uppercase tracking-[.25em] text-primary-hover">Women · Men · Kids</p>
            <h1 className="max-w-xl text-[42px] leading-[1.08] md:text-[64px]">{SITE.tagline}</h1>
            <p className="mt-6 max-w-md text-[17px] leading-relaxed text-foreground/80">
              Dresses, lingerie, sleepwear, men&apos;s tailoring and kids&apos; wear — all in one place.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/shop" className="inline-flex items-center gap-2 rounded-full bg-heading px-8 py-3.5 text-[15px] font-semibold text-white transition hover:bg-primary hover:text-heading">
                Shop Now <ArrowRight className="size-4" />
              </Link>
              <Link href="/shop?category=new-arrival" className="inline-flex items-center rounded-full border border-heading px-8 py-3.5 text-[15px] font-semibold transition hover:bg-heading hover:text-white">
                New Arrivals
              </Link>
            </div>
          </div>

          {heroMain && (
            <div className="relative mx-auto w-full max-w-[520px] md:py-10">
              <Link href={`/product/${heroMain.slug}`} className="block overflow-hidden rounded-[28px] shadow-2xl">
                <img
                  src={heroMain.images[0].src}
                  srcSet={heroMain.images[0].srcset}
                  sizes="(min-width:768px) 520px, 90vw"
                  alt={heroMain.images[0].alt || decodeEntities(heroMain.name)}
                  fetchPriority="high"
                  className="aspect-[4/5] w-full object-cover object-top transition duration-[1.5s] hover:scale-105"
                />
              </Link>

              {/* Floating product card */}
              <Link
                href={`/product/${heroMain.slug}`}
                className="absolute -left-4 top-10 hidden max-w-[230px] animate-float rounded-xl bg-white p-4 shadow-xl sm:block md:-left-12"
              >
                <p className="line-clamp-2 text-sm">{decodeEntities(heroMain.name)}</p>
                <div className="mt-1 text-sm">
                  <Price prices={heroMain.prices} onSale={heroMain.on_sale} />
                </div>
              </Link>

              {heroSide && (
                <Link
                  href={`/product/${heroSide.slug}`}
                  className="absolute -bottom-2 -left-6 hidden w-36 overflow-hidden rounded-2xl border-4 border-white shadow-xl lg:block"
                  style={{ animationDelay: "1.2s" }}
                >
                  <img src={heroSide.images[0].thumbnail} alt={decodeEntities(heroSide.name)} className="aspect-[3/4] w-full object-cover object-top" />
                </Link>
              )}

              {/* Spinning circular badge */}
              <div className="absolute -right-3 bottom-16 grid size-32 place-items-center rounded-full bg-white shadow-xl md:-right-8">
                <svg viewBox="0 0 100 100" className="absolute inset-1 animate-[spin-slow_18s_linear_infinite]" aria-hidden>
                  <defs>
                    <path id="circle" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
                  </defs>
                  <text className="fill-heading text-[10.5px] tracking-[.2em]">
                    <textPath href="#circle">SHOP CELINO • NEW SEASON • </textPath>
                  </text>
                </svg>
                <span className="font-display text-3xl text-primary-hover">SC</span>
              </div>
            </div>
          )}
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

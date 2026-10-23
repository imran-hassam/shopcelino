/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, ArrowUpRight, ShoppingBag } from "lucide-react";
import { getCategory, getProducts } from "@/lib/woo";
import { HOME_LOOKS, HOME_TABS, MENU_CATEGORIES, SITE } from "@/lib/config";
import { decodeEntities } from "@/lib/format";
import type { WCProduct } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";
import { Carousel } from "@/components/Carousel";
import { Tabs } from "@/components/Tabs";
import { Reveal } from "@/components/Reveal";
import { Price } from "@/components/Price";
import { Stars } from "@/components/Stars";

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
  const heroProducts = hero.products.length ? hero.products : tabData[0]?.products ?? [];
  const heroMain = heroProducts.find((p) => p.images.length) ?? null;
  const others = heroProducts.filter((p) => p.id !== heroMain?.id && p.images.length);
  const heroCard = others.find((p) => p.on_sale) ?? others[0] ?? null;

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-secondary/80 via-secondary/30 to-background">
        {/* Large faded brand word behind the hero */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-4 select-none text-center font-display text-[26vw] leading-none text-heading/[0.05] lg:top-6 lg:text-[19vw] 2xl:text-[280px]"
        >
          Celino
        </span>

        <div className="relative mx-auto grid max-w-[1440px] gap-8 px-5 pb-12 pt-10 md:grid-cols-2 md:px-8 lg:min-h-[660px] lg:grid-cols-[1.15fr_1fr_0.8fr] lg:items-end lg:gap-6 lg:pb-0 lg:pt-0">
          {/* Left: headline */}
          <div className="relative z-10 animate-[fadein_.9s_ease] md:col-span-2 lg:col-span-1 lg:self-center lg:pb-10 lg:pt-28">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[16px] font-semibold tracking-wide">Women · Men · Kids</p>
              {saleCount > 0 && (
                <Link href="/shop?sale=1" className="rounded-full bg-white px-3 py-1 text-sm font-bold text-heading shadow-sm ring-1 ring-primary/40 transition hover:bg-primary">
                  Sale on now
                </Link>
              )}
            </div>
            <h1 className="mt-5 max-w-[620px] text-[42px] leading-[1.05] sm:text-[56px] xl:text-[70px]">{SITE.tagline}</h1>
            <p className="mt-6 max-w-md text-[17px] leading-relaxed text-foreground/80">
              Dresses, lingerie, sleepwear, men&apos;s tailoring and kids&apos; wear — all in one place.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/shop"
                className="group inline-flex items-center gap-4 rounded-full bg-heading py-2 pl-7 pr-2 text-[16px] font-semibold text-white shadow-lg transition hover:bg-primary hover:text-heading"
              >
                Shop Now
                <span className="grid size-10 place-items-center rounded-full bg-white text-heading transition-transform group-hover:rotate-45">
                  <ArrowUpRight className="size-5" strokeWidth={1.75} />
                </span>
              </Link>
              <Link
                href="/shop?category=new-arrival"
                className="inline-flex items-center rounded-full border border-heading px-7 py-[17px] text-[16px] font-semibold leading-none transition hover:bg-heading hover:text-white"
              >
                New Arrivals
              </Link>
            </div>
          </div>

          {/* Centre: arched feature image */}
          {heroMain && (
            <Link href={`/product/${heroMain.slug}`} className="group relative mx-auto block w-full max-w-[440px] lg:max-w-none" aria-label={decodeEntities(heroMain.name)}>
              <span className="block overflow-hidden rounded-t-[999px] rounded-b-3xl shadow-2xl lg:rounded-b-none">
                <img
                  src={heroMain.images[0].src}
                  srcSet={heroMain.images[0].srcset}
                  sizes="(min-width:1024px) 34vw, (min-width:768px) 45vw, 90vw"
                  alt={heroMain.images[0].alt || decodeEntities(heroMain.name)}
                  fetchPriority="high"
                  className="aspect-[3/4] w-full object-cover object-top transition duration-[1.5s] group-hover:scale-105"
                />
              </span>
            </Link>
          )}

          {/* Right: featured product card */}
          {heroCard && <HeroProductCard product={heroCard} />}
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

/** Hero side card showing one real WooCommerce product. */
function HeroProductCard({ product }: { product: WCProduct }) {
  const img = product.images[0];
  const name = decodeEntities(product.name);
  const href = `/product/${product.slug}`;
  const regular = Number(product.prices.regular_price);
  const pct = product.on_sale && regular > 0 ? Math.round((1 - Number(product.prices.price) / regular) * 100) : 0;
  return (
    <div className="relative z-10 mx-auto w-full max-w-[360px] self-center rounded-2xl border border-line bg-white p-3 shadow-xl lg:mb-16 lg:animate-float">
      <Link href={href} className="relative block overflow-hidden rounded-xl bg-card" aria-label={name}>
        <img
          src={img.thumbnail}
          srcSet={img.thumbnail_srcset || img.srcset}
          sizes="360px"
          alt={img.alt || name}
          className="aspect-[4/3] w-full object-cover object-top transition duration-700 hover:scale-105"
        />
        {pct > 0 && (
          <span className="absolute right-3 top-3 rounded-full bg-heading px-3 py-1 text-sm font-bold text-white">{pct}% Off</span>
        )}
        <span className="absolute bottom-3 right-3 grid size-11 place-items-center rounded-full border-2 border-white bg-primary text-heading shadow-md" aria-hidden>
          <ShoppingBag className="size-5" strokeWidth={1.75} />
        </span>
      </Link>
      <div className="px-2 pb-2 pt-4">
        <Link href={href} className="hover:text-primary-hover">
          <h2 className="line-clamp-2 font-sans text-[17px] leading-snug">{name}</h2>
        </Link>
        {product.review_count > 0 && (
          <div className="mt-2">
            <Stars rating={Number(product.average_rating)} count={product.review_count} />
          </div>
        )}
        <div className="mt-3">
          <Price prices={product.prices} onSale={product.on_sale} large />
        </div>
      </div>
    </div>
  );
}

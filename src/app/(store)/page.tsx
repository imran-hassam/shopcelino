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

/** Hero photo: a real Shop Celino model shot (from the store's own product photography, white studio backdrop). */
const HERO_IMAGE = {
  src: "https://shopcelino.com/wp-content/uploads/2026/09/CEWM0163.jpg",
  alt: "Model wearing a yellow off-the-shoulder blouse from Shop Celino",
};

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
      <div className="h-[640px] bg-[color-mix(in_srgb,var(--secondary-color)_55%,var(--card-background))] sm:h-[760px] lg:h-[clamp(560px,42vw,780px)]" />
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

  return (
    <>
      {/* HERO — one full-width studio photo: model on the right, text on the left.
          The photo's white backdrop is multiplied into the brand cream so it reads as one image edge to edge. */}
      <section className="relative isolate flex flex-col overflow-hidden bg-[color-mix(in_srgb,var(--secondary-color)_55%,var(--card-background))] text-heading lg:block lg:h-[clamp(560px,42vw,780px)]">
        <div className="relative order-2 h-[380px] mix-blend-multiply [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)] sm:h-[500px] lg:absolute lg:right-[2vw] lg:top-0 lg:aspect-square lg:h-auto lg:w-[min(58vw,1120px)] lg:[mask-image:linear-gradient(to_right,transparent,black_24%)]">
          <Image
            src={HERO_IMAGE.src}
            alt={HERO_IMAGE.alt}
            fill
            sizes="(min-width:1024px) 58vw, 100vw"
            quality={80}
            fetchPriority="high"
            loading="eager"
            className="object-cover object-[50%_0%]"
          />
        </div>

        <div className="relative order-1 mx-auto w-full max-w-[1440px] px-4 pb-6 pt-10 md:px-8 md:pt-14 lg:flex lg:h-full lg:items-center lg:py-0">
          <div className="max-w-[560px] animate-[fadein_.9s_ease] lg:max-w-[min(560px,40vw)]">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[13px] font-semibold uppercase tracking-[0.25em] text-primary-hover">Women · Men · Kids</p>
              {saleCount > 0 && (
                <Link href="/shop?sale=1" className="rounded-full border border-primary-hover/50 px-3 py-0.5 text-[13px] text-primary-hover transition hover:bg-heading hover:text-white">
                  Sale on now
                </Link>
              )}
            </div>
            <h1 className="mt-5 text-[38px] leading-[1.15] sm:text-[48px] lg:text-[44px] xl:text-[56px] 2xl:text-[62px]">{SITE.tagline}</h1>
            <p className="mt-6 max-w-md text-[16px] leading-relaxed tracking-wide text-heading/80">
              Dresses, lingerie, sleepwear, men&apos;s tailoring and kids&apos; wear — all in one place.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-6">
              <Link
                href="/shop"
                className="inline-flex items-center bg-heading px-8 py-4 text-[14px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-primary hover:text-heading"
              >
                Shop Now
              </Link>
              <Link
                href="/shop?category=new-arrival"
                className="group inline-flex items-center gap-2 text-[14px] font-semibold uppercase tracking-[0.12em] text-heading/85 hover:text-primary-hover"
              >
                New Arrivals <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
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

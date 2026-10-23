/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight } from "lucide-react";
import { getProducts, getWpPage } from "@/lib/woo";
import { decodeEntities, sanitizeHtml, stripHtml } from "@/lib/format";
import { MENU_CATEGORIES, SITE } from "@/lib/config";
import { CONTACT } from "@/lib/contact";
import type { WCProduct } from "@/lib/types";
import { Reveal } from "@/components/Reveal";
import { PageHero } from "@/components/PageHero";

export const metadata: Metadata = {
  title: "About Us",
  description: `About ${SITE.name} — online fashion for women, men and kids.`,
  alternates: { canonical: "/about" },
};

/** Categories used for the photo collage and the wide banner (real store photos). */
const PHOTO_CATEGORIES = ["womens-dresses", "womens-lingerie", "mens-formal-wear"];

export default function AboutPage() {
  return (
    <>
      {/* Page heading + breadcrumb */}
      <PageHero title="About Us" crumbs={[{ label: "About Us" }]} />

      <Suspense fallback={<AboutSkeleton />}>
        <AboutContent />
      </Suspense>
    </>
  );
}

async function AboutContent() {
  const [all, sale, wpPage, featured, ...photoLists] = await Promise.all([
    getProducts({ perPage: 1 }),
    getProducts({ onSale: true, perPage: 1 }),
    getWpPage("about-us"),
    getProducts({ category: "featured", perPage: 10 }),
    ...PHOTO_CATEGORIES.map((slug) => getProducts({ category: slug, perPage: 4, orderby: "popularity" })),
  ]);

  // One distinct product photo per category.
  const used = new Set<number>();
  const photos = photoLists.map((list) => {
    const p = list.products.find((x) => x.images.length && !used.has(x.id));
    if (p) used.add(p.id);
    return p ?? null;
  });
  const [c1, c2, c3] = photos;
  // Wide banner: four featured product photos side by side, each shown uncropped.
  const banner = featured.products.filter((p) => p.images.length && !used.has(p.id)).slice(0, 4);

  // Show WordPress "About Us" text only if the page actually has words in it.
  const wpHtml = wpPage && stripHtml(wpPage.content.rendered).length > 80 ? sanitizeHtml(wpPage.content.rendered) : null;

  // Live numbers straight from the WooCommerce catalogue — nothing estimated.
  const stats = [
    all.total > 0 && { value: all.total.toLocaleString("en-US"), label: "Products in our shop", note: "Across women's, men's and kids' collections." },
    sale.total > 0 && { value: sale.total.toLocaleString("en-US"), label: "Styles on sale right now", note: "Marked down in the shop today." },
  ].filter(Boolean) as { value: string; label: string; note: string }[];

  return (
    <>
      {/* Intro + collage */}
      <section className="mx-auto grid max-w-[1440px] items-center gap-12 px-5 py-16 md:px-8 md:py-24 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <h2 className="text-[32px] leading-tight md:text-[40px]">Welcome to {SITE.name}</h2>
          <p className="mt-6 font-display text-xl text-primary-hover">{SITE.tagline}</p>
          <p className="mt-5 text-[17px] leading-relaxed text-foreground/80">
            {SITE.name} is an online fashion store for women, men and kids. Our collections bring together dresses,
            lingerie and sleepwear, women&apos;s apparel, men&apos;s formal wear and streetwear, ties and accessories, and
            kidswear — so you can shop for the whole wardrobe in one place.
          </p>

          {stats.length > 0 && (
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {stats.map((s) => (
                <div key={s.label} className="rounded-2xl border border-line bg-white p-7 shadow-sm">
                  <p className="font-display text-[40px] leading-none text-primary-hover">{s.value}</p>
                  <p className="mt-4 text-[17px] font-semibold">{s.label}</p>
                  <p className="mt-2 text-[15px] text-muted">{s.note}</p>
                </div>
              ))}
            </div>
          )}
        </Reveal>

        <Reveal delay={150}>
          <div className="grid grid-cols-[1fr_1.15fr] gap-4">
            <div className="grid gap-4">
              <CollageImage product={c1} className="aspect-[4/3]" />
              <CollageImage product={c2} className="aspect-[4/3]" />
            </div>
            <CollageImage product={c3} className="h-full min-h-[280px]" />
          </div>
        </Reveal>
      </section>

      {/* More about the store */}
      <section className="mx-auto max-w-[1440px] px-5 md:px-8">
        <Reveal>
          {wpHtml ? (
            <div className="prose-wc text-[17px] text-foreground/80" dangerouslySetInnerHTML={{ __html: wpHtml }} />
          ) : (
            <div className="space-y-5 text-[17px] leading-relaxed text-foreground/80">
              <p>
                Browse by collection —{" "}
                {MENU_CATEGORIES.map((c, i) => (
                  <span key={c.slug}>
                    <Link href={`/shop?category=${c.slug}`} className="underline decoration-primary/60 underline-offset-4 hover:text-primary-hover">
                      {c.label}
                    </Link>
                    {i < MENU_CATEGORIES.length - 1 ? ", " : "."}
                  </span>
                ))}{" "}
                All prices on the site are shown in US dollars.
              </p>
              <p>
                Questions about sizing, an order or delivery? Email us at{" "}
                <a href={`mailto:${CONTACT.email}`} className="underline underline-offset-4 hover:text-primary-hover">{CONTACT.email}</a> or call{" "}
                <a href={`tel:${CONTACT.phone.replace(/[^\d+]/g, "")}`} className="underline underline-offset-4 hover:text-primary-hover">{CONTACT.phone}</a>.
                Our mailing address is {CONTACT.address.join(", ")}.
              </p>
            </div>
          )}
        </Reveal>
      </section>

      {/* Wide image */}
      {banner.length >= 2 && (
        <section className="mx-auto max-w-[1440px] px-5 pt-16 md:px-8 md:pt-20">
          <Reveal>
            <div className={`grid grid-cols-2 overflow-hidden rounded-2xl bg-card ${banner.length >= 4 ? "md:grid-cols-4" : ""}`}>
              {banner.map((p, i) => (
                <Link
                  key={p.id}
                  href={`/product/${p.slug}`}
                  className={`group relative block overflow-hidden ${i >= 2 ? "hidden md:block" : ""}`}
                >
                  <img
                    src={p.images[0].src}
                    srcSet={p.images[0].srcset}
                    sizes="(min-width:768px) 25vw, 50vw"
                    alt={p.images[0].alt || decodeEntities(p.name)}
                    loading="lazy"
                    className="aspect-[3/4] w-full object-cover object-top transition duration-[1.2s] group-hover:scale-105"
                  />
                </Link>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* CTA */}
      <section className="mx-auto max-w-[1440px] px-5 pb-24 pt-10 md:px-8">
        <Reveal>
          <div className="flex flex-col items-start justify-between gap-8 rounded-2xl bg-footer px-7 py-10 text-footer-text md:flex-row md:items-center md:px-12 md:py-14">
            <div>
              <h2 className="text-[30px] leading-tight !text-footer-text md:text-[38px]">Find your next favourite piece</h2>
              <p className="mt-3 max-w-xl text-[17px] text-footer-text/75">
                Browse every collection in one place, with filters for category, price and availability.
              </p>
            </div>
            <Link
              href="/shop"
              className="group inline-flex shrink-0 items-center gap-4 rounded-full bg-primary py-2 pl-7 pr-2 text-[16px] font-bold text-heading transition hover:bg-secondary"
            >
              Shop Now
              <span className="grid size-10 place-items-center rounded-full bg-heading text-white transition-transform group-hover:rotate-45">
                <ArrowUpRight className="size-5" strokeWidth={1.75} />
              </span>
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}

function CollageImage({ product, className = "" }: { product: WCProduct | null; className?: string }) {
  if (!product) return <div className={`rounded-2xl bg-card ${className}`} />;
  const img = product.images[0];
  return (
    <Link href={`/product/${product.slug}`} className={`group block overflow-hidden rounded-2xl bg-card ${className}`}>
      <img
        src={img.src}
        srcSet={img.srcset}
        sizes="(min-width:1024px) 25vw, 50vw"
        alt={img.alt || decodeEntities(product.name)}
        loading="lazy"
        className="size-full object-cover object-top transition duration-700 group-hover:scale-105"
      />
    </Link>
  );
}

function AboutSkeleton() {
  return (
    <div className="mx-auto grid max-w-[1440px] animate-pulse gap-12 px-5 py-16 md:px-8 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="h-10 w-2/3 rounded bg-card" />
        <div className="h-32 rounded bg-card" />
        <div className="grid grid-cols-2 gap-5"><div className="h-40 rounded-2xl bg-card" /><div className="h-40 rounded-2xl bg-card" /></div>
      </div>
      <div className="h-[480px] rounded-2xl bg-card" />
    </div>
  );
}

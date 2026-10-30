import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getProductBySlug, getRelatedProducts, getVariations, getWpPage, mainCategory } from "@/lib/woo";
import { decodeEntities, formatMoney, sanitizeHtml, stripHtml } from "@/lib/format";
import { SITE, categoryLabel } from "@/lib/config";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductBuyBox } from "@/components/ProductBuyBox";
import { Accordion } from "@/components/Accordion";
import { ShareLinks } from "@/components/ShareLinks";
import { ProductCard } from "@/components/ProductCard";
import { Carousel } from "@/components/Carousel";

/** Cut text at a word boundary so titles and descriptions stay readable in search results. */
function clip(text: string, max: number) {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(" ") > max * 0.6 ? cut.lastIndexOf(" ") : cut.length).replace(/[\s,;:–—-]+$/, "") + "…";
}

export async function generateMetadata({ params }: PageProps<"/product/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Product not found", robots: { index: false } };
  const name = decodeEntities(p.name);
  const price = formatMoney(p.prices.price_range?.min_amount ?? p.prices.price, p.prices);
  const text = stripHtml(p.short_description || p.description);
  // Product text from WooCommerce if it has some, otherwise a plain factual line.
  const desc = clip(text.length >= 60 ? text : `${name}. From ${price} at ${SITE.name}${p.on_sale ? ", now on sale" : ""}.`, 158);
  const title = clip(name, 60);
  const image = p.images[0] ? [{ url: p.images[0].src, alt: p.images[0].alt || name }] : [];
  return {
    title,
    description: desc,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: { title: `${title} | ${SITE.name}`, description: desc, url: `/product/${p.slug}`, images: image },
    twitter: { card: image.length ? "summary_large_image" : "summary", title: `${title} | ${SITE.name}`, description: desc },
  };
}

export default function ProductPage({ params }: PageProps<"/product/[slug]">) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductContent params={params} />
    </Suspense>
  );
}

async function ProductContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  // Only published products exist in the Store API: drafts show "not found".
  if (!product) notFound();

  const [variations, related, refundPage, shippingPage] = await Promise.all([
    product.variations.length ? getVariations(product.slug, product.variations.map((v) => v.id)) : Promise.resolve([]),
    getRelatedProducts(product),
    getWpPage("refund_returns"),
    getWpPage("shipping-policy"),
  ]);

  const name = decodeEntities(product.name);

  const summary = stripHtml(product.short_description);
  // Structured data from the real WooCommerce product (price, currency, stock, images).
  const money = (v: string) => (Number(v) / 10 ** product.prices.currency_minor_unit).toFixed(2);
  const range = product.prices.price_range;
  const url = `${SITE.url}/product/${product.slug}`;
  const availability = product.is_in_stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
  const seller = { "@type": "Organization", name: SITE.name };
  const mainCat = mainCategory(product);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    sku: product.sku || undefined,
    image: product.images.map((i) => i.src),
    description: stripHtml(product.short_description || product.description).slice(0, 500) || undefined,
    url,
    offers:
      range && range.min_amount !== range.max_amount
        ? { "@type": "AggregateOffer", url, priceCurrency: product.prices.currency_code, lowPrice: money(range.min_amount), highPrice: money(range.max_amount), offerCount: product.variations.length || undefined, availability, seller }
        : { "@type": "Offer", url, priceCurrency: product.prices.currency_code, price: money(product.prices.price), availability, seller },
    ...(product.review_count > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.average_rating, reviewCount: product.review_count } }
      : {}),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE.url}/` },
      { "@type": "ListItem", position: 2, name: "Shop", item: `${SITE.url}/shop` },
      ...(mainCat ? [{ "@type": "ListItem", position: 3, name: categoryLabel(mainCat.slug, decodeEntities(mainCat.name)), item: `${SITE.url}/shop?category=${mainCat.slug}` }] : []),
      { "@type": "ListItem", position: mainCat ? 4 : 3, name, item: url },
    ],
  };

  const sections = [
    product.description && {
      title: "Product Info",
      html: sanitizeHtml(product.description),
    },
    refundPage && { title: "Return & Refund Policy", html: sanitizeHtml(refundPage.content.rendered) },
    shippingPage && { title: "Shipping Info", html: sanitizeHtml(shippingPage.content.rendered) },
  ].filter(Boolean) as { title: string; html: string }[];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, "\\u003c") }} />

      <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-8 md:px-8 md:pt-12">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14">
        <ProductGallery images={product.images} name={name} />

        <div>
          <div className="glass-card rounded-3xl p-5 sm:p-7 md:p-8">
          <h1 className="text-[32px] leading-tight md:text-[40px]">{name}</h1>
          <ProductBuyBox
            product={{
              id: product.id,
              slug: product.slug,
              image: product.images[0]?.thumbnail,
              name,
              sku: product.sku,
              type: product.type,
              prices: product.prices,
              on_sale: product.on_sale,
              is_in_stock: product.is_in_stock,
              is_purchasable: product.is_purchasable,
              attributes: product.attributes.filter((a) => a.has_variations),
              variationRefs: product.variations,
              max: product.add_to_cart.maximum,
              soldIndividually: product.sold_individually,
            }}
            variations={variations.map((v) => ({
              id: v.id,
              sku: v.sku,
              prices: v.prices,
              on_sale: v.on_sale,
              is_in_stock: v.is_in_stock,
              is_purchasable: v.is_purchasable,
              image: v.images[0]?.id,
            }))}
            summary={summary}
          />
          </div>

          {sections.length > 0 && (
            <div className="glass-card mt-6 rounded-3xl px-5 sm:px-7 md:px-8">
              <Accordion items={sections} />
            </div>
          )}

          <ShareLinks url={`${SITE.url}/product/${product.slug}`} title={name} image={product.images[0]?.src} />
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-24">
          <h2 className="mb-8 text-[30px]">You May Also Like</h2>
          <Carousel label="Related products">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </Carousel>
        </section>
      )}
      </div>
    </>
  );
}

function ProductSkeleton() {
  return (
    <>
    <div className="mx-auto grid max-w-[1440px] animate-pulse gap-10 px-5 pb-20 pt-8 md:px-8 md:pt-12 lg:grid-cols-[1.15fr_1fr]">
      <div className="aspect-[4/5] rounded-3xl bg-white/50" />
      <div className="space-y-4">
        <div className="h-10 w-3/4 rounded bg-card" />
        <div className="h-6 w-1/4 rounded bg-card" />
        <div className="h-24 rounded bg-card" />
        <div className="h-14 rounded-full bg-card" />
      </div>
    </div>
    </>
  );
}

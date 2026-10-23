import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getProductBySlug, getRelatedProducts, getVariations, getWpPage } from "@/lib/woo";
import { decodeEntities, sanitizeHtml, stripHtml } from "@/lib/format";
import { SITE } from "@/lib/config";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductBuyBox } from "@/components/ProductBuyBox";
import { Accordion } from "@/components/Accordion";
import { ShareLinks } from "@/components/ShareLinks";
import { ProductCard } from "@/components/ProductCard";
import { Carousel } from "@/components/Carousel";

export async function generateMetadata({ params }: PageProps<"/product/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Product not found" };
  const desc = stripHtml(p.short_description || p.description).slice(0, 160);
  return {
    title: decodeEntities(p.name),
    description: desc || undefined,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: { title: decodeEntities(p.name), description: desc, images: p.images[0] ? [{ url: p.images[0].src }] : [] },
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
  if (!product) notFound();

  const [variations, related, refundPage, shippingPage] = await Promise.all([
    product.variations.length ? getVariations(product.slug, product.variations.map((v) => v.id)) : Promise.resolve([]),
    getRelatedProducts(product),
    getWpPage("refund_returns"),
    getWpPage("shipping-policy"),
  ]);

  const name = decodeEntities(product.name);

  const summary = stripHtml(product.short_description);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    sku: product.sku || undefined,
    image: product.images.map((i) => i.src),
    description: stripHtml(product.short_description || product.description).slice(0, 500),
    brand: { "@type": "Brand", name: SITE.name },
    offers: {
      "@type": "Offer",
      url: `${SITE.url}/product/${product.slug}`,
      priceCurrency: product.prices.currency_code,
      price: (Number(product.prices.price) / 10 ** product.prices.currency_minor_unit).toFixed(2),
      availability: product.is_in_stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
    ...(product.review_count > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.average_rating, reviewCount: product.review_count } }
      : {}),
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

      <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-8 md:px-8 md:pt-12">
      <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
        <ProductGallery images={product.images} name={name} />

        <div className="lg:pt-2">
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

          {sections.length > 0 && (
            <div className="mt-10">
              <Accordion items={sections} />
            </div>
          )}

          <ShareLinks url={`${SITE.url}/product/${product.slug}`} title={name} image={product.images[0]?.src} />
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-24">
          <h2 className="mb-8 text-[30px]">Related Products</h2>
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
      <div className="aspect-[4/5] rounded-2xl bg-card" />
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

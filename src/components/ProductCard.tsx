/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { WCProduct } from "@/lib/types";
import { decodeEntities } from "@/lib/format";
import { Price } from "./Price";
import { Stars } from "./Stars";
import { WishButton } from "./WishButton";

export function productBadge(p: WCProduct): string | null {
  const slugs = p.categories.map((c) => c.slug);
  if (p.on_sale) return "Sale";
  if (slugs.includes("best-seller")) return "Best Seller";
  if (slugs.includes("new-arrival")) return "New";
  return null;
}

export function ProductCard({ product, priority = false }: { product: WCProduct; priority?: boolean }) {
  const [img, img2] = product.images;
  const name = decodeEntities(product.name);
  const badge = productBadge(product);
  const href = `/product/${product.slug}`;
  const sku = product.card_sku ?? product.sku;
  return (
    <article className="group">
      <div className="relative overflow-hidden rounded-xl bg-card">
        <Link href={href} className="block aspect-[3/4]" aria-label={name}>
          {img ? (
            <>
              <img
                src={img.thumbnail}
                srcSet={img.thumbnail_srcset || img.srcset}
                sizes="(min-width:1280px) 22vw, (min-width:768px) 30vw, 50vw"
                alt={img.alt || name}
                loading={priority ? "eager" : "lazy"}
                decoding="async"
                className={`absolute inset-0 size-full object-cover object-top transition duration-700 group-hover:scale-105 ${img2 ? "group-hover:opacity-0" : ""}`}
              />
              {img2 && (
                <img
                  src={img2.thumbnail}
                  srcSet={img2.thumbnail_srcset || img2.srcset}
                  sizes="(min-width:1280px) 22vw, (min-width:768px) 30vw, 50vw"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 size-full scale-105 object-cover object-top opacity-0 transition duration-700 group-hover:scale-100 group-hover:opacity-100"
                />
              )}
            </>
          ) : (
            <span className="grid size-full place-items-center text-sm text-muted">No image</span>
          )}
        </Link>
        {badge && (
          <span className="pointer-events-none absolute left-3 top-3 rounded bg-heading px-2 py-0.5 text-xs font-bold text-white">
            {badge}
          </span>
        )}
        <WishButton
          item={{ id: product.id, slug: product.slug, name, image: img?.thumbnail, price: product.prices.price, sku }}
          className="absolute right-3 top-3"
        />
        {!product.is_in_stock && (
          <span className="absolute inset-x-3 bottom-3 rounded-full bg-white/90 py-1.5 text-center text-xs font-semibold">Out of stock</span>
        )}
      </div>
      <Link href={href} className="mt-4 block text-[16px] leading-snug hover:text-primary-hover">
        <h3 className="line-clamp-2 font-sans text-[16px]">{name}</h3>
      </Link>
      {sku && <p className="mt-1 truncate text-[13px] text-muted">SKU: {sku}</p>}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <Price prices={product.prices} onSale={product.on_sale} />
        {product.review_count > 0 && <Stars rating={Number(product.average_rating)} count={product.review_count} />}
      </div>
    </article>
  );
}

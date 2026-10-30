import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { MEGA_COLLECTIONS, MENU_CATEGORIES, categoryLabel } from "./config";
import { decodeEntities, formatMoney } from "./format";
import { getActiveCategories, getProducts, wpBase } from "./woo";

/** Menu name for a category: the label set in config, else a friendly or WooCommerce name. */
function menuName(slug: string, wpName: string) {
  return MENU_CATEGORIES.find((m) => m.slug === slug)?.label ?? categoryLabel(slug, decodeEntities(wpName));
}

/** Everything the SHOP mega menu shows — all real WooCommerce / WordPress data. */
export type MegaMenuData = {
  categories: { slug: string; name: string; count: number; image: string | null; children: { slug: string; name: string }[] }[];
  collections: { slug: string; name: string; count: number }[];
  products: { slug: string; name: string; price: string; image: string | null }[];
  feature:
    | { kind: "post"; title: string; href: string }
    | { kind: "category"; slug: string; name: string; count: number }
    | null;
  /** Menu categories that currently have published products (used by the mobile menu too). */
  menu: { slug: string; label: string }[];
};

export async function getMegaMenu(): Promise<MegaMenuData> {
  "use cache";
  cacheTag("products", "categories", "mega-menu");
  // Only categories that have published products right now (counts = published products).
  const cats = await getActiveCategories();
  const bySlug = new Map(cats.map((c) => [c.slug, c]));
  const menu = MENU_CATEGORIES.filter((m) => bySlug.has(m.slug));

  // Top row: the first five active menu categories.
  const top = menu.map((m) => bySlug.get(m.slug)!).slice(0, 5);
  const [topLists, featured, post] = await Promise.all([
    Promise.all(top.map((c) => getProducts({ category: c.slug, perPage: 6 }))), // newest first
    getProducts({ category: "featured", perPage: 12 }),
    getLatestPost(),
  ]);

  const categories = top.map((c, i) => ({
    slug: c.slug,
    name: menuName(c.slug, c.name),
    count: c.count,
    // The category's own image if it has one, otherwise a photo of one of its products.
    image: c.image?.thumbnail ?? topLists[i]?.products.find((p) => p.images.length)?.images[0]?.thumbnail ?? null,
    children: cats.filter((x) => x.parent === c.id && x.count > 0).slice(0, 2).map((x) => ({ slug: x.slug, name: menuName(x.slug, x.name) })),
  }));

  const collections = MEGA_COLLECTIONS.filter((slug) => bySlug.has(slug)).map((slug) => {
    const c = bySlug.get(slug)!;
    return { slug, name: menuName(slug, c.name), count: c.count };
  });

  // Three newest products, one from each of the first categories (a varied mix), never repeating a card photo.
  const cardImages = new Set(categories.map((c) => c.image));
  const used = new Set<number>();
  const picks: typeof featured.products = [];
  for (const list of topLists) {
    const p = list?.products.find((x) => x.images.length && !cardImages.has(x.images[0].thumbnail) && !used.has(x.id));
    if (p && picks.length < 3) {
      picks.push(p);
      used.add(p.id);
    }
  }
  // Top up from Featured if a category had nothing suitable.
  for (const p of featured.products) {
    if (picks.length < 3 && p.images.length && !used.has(p.id)) {
      picks.push(p);
      used.add(p.id);
    }
  }
  const products = picks.slice(0, 3).map((p) => {
    const r = p.prices.price_range;
    return {
      slug: p.slug,
      name: decodeEntities(p.name),
      price: r && r.min_amount !== r.max_amount ? `${formatMoney(r.min_amount, p.prices)} – ${formatMoney(r.max_amount, p.prices)}` : formatMoney(p.prices.price, p.prices),
      image: p.images[0]?.thumbnail ?? null,
    };
  });

  const newArrival = collections.find((c) => c.slug === "new-arrival");
  const feature: MegaMenuData["feature"] = post
    ? { kind: "post", title: post.title, href: post.link }
    : newArrival
      ? { kind: "category", slug: newArrival.slug, name: newArrival.name, count: newArrival.count }
      : null;

  // If WordPress didn't answer for something, try again in a few minutes instead of keeping the gap for hours.
  const complete = categories.length === Math.min(5, menu.length) && categories.length > 0 && categories.every((c) => c.image) && products.length === 3;
  if (complete) cacheLife({ stale: 60, revalidate: 600, expire: 86400 });
  else cacheLife("minutes");
  return { categories, collections, products, feature, menu };
}

/** Latest published blog post on the WordPress site, if there is one. */
async function getLatestPost(): Promise<{ title: string; link: string } | null> {
  try {
    const res = await fetch(`${wpBase()}/wp-json/wp/v2/posts?per_page=1&_fields=title,link`, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const [p] = (await res.json()) as { title: { rendered: string }; link: string }[];
    return p ? { title: decodeEntities(p.title.rendered.replace(/<[^>]*>/g, "")), link: p.link } : null;
  } catch {
    return null;
  }
}

/** Data for the "Today's Sales" mega menu — real WooCommerce categories and sale products. */
export type SalesMenuData = {
  categories: { slug: string; name: string; image: string | null }[];
  products: { slug: string; name: string; image: string | null; price: string; regular: string | null }[];
};

export async function getSalesMenu(): Promise<SalesMenuData> {
  "use cache";
  cacheTag("products", "categories", "sales-menu");
  const cats = await getActiveCategories();
  const bySlug = new Map(cats.map((c) => [c.slug, c]));
  const shopBy = MENU_CATEGORIES.map((m) => bySlug.get(m.slug)).filter((c) => !!c).slice(0, 8) as typeof cats;

  const [lists, sale] = await Promise.all([
    Promise.all(shopBy.map((c) => (c.image ? Promise.resolve(null) : getProducts({ category: c.slug, perPage: 6 })))), // newest first
    // Newest products that are on sale right now.
    getProducts({ onSale: true, orderby: "date", order: "desc", perPage: 6 }),
  ]);

  // One photo per circle, never the same photo twice (some products sit in several categories).
  const usedImgs = new Set<string>();
  const categories = shopBy.map((c, i) => {
    const image =
      c.image?.thumbnail ??
      lists[i]?.products.map((p) => p.images[0]?.thumbnail).find((t) => t && !usedImgs.has(t)) ??
      lists[i]?.products.find((p) => p.images.length)?.images[0]?.thumbnail ??
      null;
    if (image) usedImgs.add(image);
    return { slug: c.slug, name: menuName(c.slug, c.name), image };
  });

  const products = sale.products.map((p) => {
    const r = p.prices.price_range;
    const range = r && r.min_amount !== r.max_amount;
    return {
      slug: p.slug,
      name: decodeEntities(p.name),
      image: p.images[0]?.thumbnail ?? null,
      price: range ? `${formatMoney(r!.min_amount, p.prices)} – ${formatMoney(r!.max_amount, p.prices)}` : formatMoney(p.prices.price, p.prices),
      regular: !range && p.prices.regular_price !== p.prices.price ? formatMoney(p.prices.regular_price, p.prices) : null,
    };
  });

  // Incomplete (e.g. WordPress timed out): keep it only briefly so the next request retries.
  if (categories.length > 0 && categories.every((c) => c.image) && (products.length === 6 || products.length === sale.total)) cacheLife({ stale: 60, revalidate: 600, expire: 86400 });
  else cacheLife("seconds");
  return { categories, products };
}

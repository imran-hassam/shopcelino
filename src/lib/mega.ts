import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { MEGA_COLLECTIONS, MENU_CATEGORIES } from "./config";
import { decodeEntities, formatMoney } from "./format";
import { getAllCategories, getProducts, wpBase } from "./woo";

/** Everything the SHOP mega menu shows — all real WooCommerce / WordPress data. */
export type MegaMenuData = {
  categories: { slug: string; name: string; count: number; image: string | null; children: { slug: string; name: string }[] }[];
  collections: { slug: string; name: string; count: number }[];
  products: { slug: string; name: string; price: string; image: string | null }[];
  feature:
    | { kind: "post"; title: string; href: string }
    | { kind: "category"; slug: string; name: string; count: number }
    | null;
};

export async function getMegaMenu(): Promise<MegaMenuData> {
  "use cache";
  cacheTag("products", "categories", "mega-menu");
  const cats = await getAllCategories();
  const bySlug = new Map(cats.map((c) => [c.slug, c]));

  // Top row: the first five menu categories that exist and have products.
  const top = MENU_CATEGORIES.map((m) => bySlug.get(m.slug)).filter((c) => c && c.count > 0).slice(0, 5) as typeof cats;
  const [topLists, featured, post] = await Promise.all([
    Promise.all(top.map((c) => getProducts({ category: c.slug, perPage: 6, orderby: "popularity" }))),
    getProducts({ category: "featured", perPage: 12 }),
    getLatestPost(),
  ]);

  const categories = top.map((c, i) => ({
    slug: c.slug,
    name: decodeEntities(c.name),
    count: c.count,
    // The category's own image if it has one, otherwise a photo of one of its products.
    image: c.image?.thumbnail ?? topLists[i]?.products.find((p) => p.images.length)?.images[0]?.thumbnail ?? null,
    children: cats.filter((x) => x.parent === c.id && x.count > 0).slice(0, 2).map((x) => ({ slug: x.slug, name: decodeEntities(x.name) })),
  }));

  const collections = MEGA_COLLECTIONS.map((slug) => bySlug.get(slug))
    .filter((c) => c && c.count > 0)
    .map((c) => ({ slug: c!.slug, name: decodeEntities(c!.name), count: c!.count }));

  // Three popular products, one from each of the first categories (a varied mix), never repeating a card photo.
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

  const newArrival = bySlug.get("new-arrival");
  const feature: MegaMenuData["feature"] = post
    ? { kind: "post", title: post.title, href: post.link }
    : newArrival && newArrival.count > 0
      ? { kind: "category", slug: newArrival.slug, name: decodeEntities(newArrival.name), count: newArrival.count }
      : null;

  // If WordPress didn't answer for something, try again in a few minutes instead of keeping the gap for hours.
  const complete = categories.length === 5 && categories.every((c) => c.image) && products.length === 3;
  if (complete) cacheLife("hours");
  else cacheLife("minutes");
  return { categories, collections, products, feature };
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

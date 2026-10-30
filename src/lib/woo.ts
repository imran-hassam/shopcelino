import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { FILTER_CATEGORY_SLUGS, PAGE_SIZE, WOMEN_COLLECTIONS, isWomenCategory } from "./config";
import type { ProductList, WCCategory, WCProduct } from "./types";

/**
 * WooCommerce access. Catalog reads use the public Store API (no keys needed).
 * The consumer key/secret are only used server-side for the admin REST API
 * (health check) and are never sent to the browser.
 */

export function wpBase(): string {
  const url = process.env.WORDPRESS_URL;
  if (!url) throw new Error("WORDPRESS_URL is not set");
  return url.replace(/\/+$/, "");
}

const STORE = "/wp-json/wc/store/v1";

type Query = Record<string, string | number | boolean | undefined | string[]>;

function buildUrl(path: string, query: Query = {}) {
  const u = new URL(wpBase() + path);
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === "") continue;
    if (Array.isArray(v)) v.forEach((x) => u.searchParams.append(`${k}[]`, x));
    else u.searchParams.set(k, String(v));
  }
  return u.toString();
}

export async function storeGet<T>(path: string, query: Query = {}, timeoutMs = 15000) {
  const res = await fetch(buildUrl(STORE + path, query), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`Store API ${path} → ${res.status}`);
  const data = (await res.json()) as T;
  return {
    data,
    total: Number(res.headers.get("x-wp-total") ?? 0),
    totalPages: Number(res.headers.get("x-wp-totalpages") ?? 0),
  };
}

// ---------- Categories ----------

export async function getAllCategories(): Promise<WCCategory[]> {
  "use cache";
  cacheTag("categories");
  try {
    const all: WCCategory[] = [];
    for (let page = 1; page <= 5; page++) {
      const { data, totalPages } = await storeGet<WCCategory[]>("/products/categories", {
        per_page: 100,
        page,
      });
      all.push(...data);
      if (page >= totalPages || data.length < 100) break;
    }
    cacheLife("hours");
    return all;
  } catch (e) {
    console.error(e);
    cacheLife("seconds");
    return [];
  }
}

export async function getCategory(slug: string) {
  const cats = await getAllCategories();
  return cats.find((c) => c.slug === slug) ?? null;
}

/** Ids of the women's categories (see WOMEN_CATEGORY_SLUGS). */
export async function womenCategoryIds() {
  const cats = await getAllCategories();
  return cats.filter((c) => isWomenCategory(c.slug)).map((c) => c.id);
}

/**
 * Store API query part that limits any product request to women's products.
 * WooCommerce returns products in ANY of these categories (operator "in").
 */
export async function womenOnlyQuery(): Promise<{ category?: string }> {
  const ids = await womenCategoryIds();
  return ids.length ? { category: ids.join(",") } : {};
}

/** True if the product is part of the women's-only storefront. */
export function isWomenProduct(p: Pick<WCProduct, "categories">) {
  return p.categories.some((c) => isWomenCategory(c.slug));
}

/** The product's main women's category (used for breadcrumbs and "related" products). */
export function mainWomenCategory(p: Pick<WCProduct, "categories">) {
  return (
    FILTER_CATEGORY_SLUGS.map((s) => p.categories.find((c) => c.slug === s)).find(Boolean) ??
    p.categories.find((c) => isWomenCategory(c.slug)) ??
    null
  );
}

// ---------- Products ----------

export type ProductQuery = {
  category?: string; // slug
  search?: string;
  page?: number;
  perPage?: number;
  orderby?: "date" | "price" | "popularity" | "rating" | "title" | "menu_order" | "include";
  /** Restrict to these product ids (used by search results). Empty array = no results. */
  include?: number[];
  order?: "asc" | "desc";
  minPrice?: number; // whole currency units
  maxPrice?: number;
  onSale?: boolean;
  inStock?: boolean;
};

export async function getProducts(q: ProductQuery = {}): Promise<ProductList> {
  "use cache";
  cacheTag("products");
  try {
    if (q.include && q.include.length === 0) {
      cacheLife("hours");
      return { products: [], total: 0, totalPages: 0 };
    }
    const query: Query = {
      include: q.include?.join(","),
      per_page: q.perPage ?? PAGE_SIZE,
      page: q.page ?? 1,
      orderby: q.orderby,
      order: q.order,
      search: q.search,
      on_sale: q.onSale ? true : undefined,
      min_price: q.minPrice !== undefined ? q.minPrice * 100 : undefined,
      max_price: q.maxPrice !== undefined ? q.maxPrice * 100 : undefined,
      stock_status: q.inStock ? ["instock"] : undefined,
    };
    // Women's-only storefront: every request is limited to women's categories.
    const collection = q.category ? WOMEN_COLLECTIONS[q.category] : undefined;
    if (!q.category) {
      Object.assign(query, await womenOnlyQuery());
    } else if (isWomenCategory(q.category) || collection) {
      const cats = await getAllCategories();
      const slugs = collection ? collection.slugs : [q.category];
      const ids = cats.filter((c) => slugs.includes(c.slug)).map((c) => c.id);
      if (!ids.length) {
        cacheLife("minutes");
        return { products: [], total: 0, totalPages: 0 };
      }
      query.category = ids.join(",");
    } else {
      // Another WooCommerce list (e.g. "featured") that mixes in non-women items: read it and keep the women's products.
      const cat = await getCategory(q.category);
      if (!cat) {
        cacheLife("minutes");
        return { products: [], total: 0, totalPages: 0 };
      }
      const { data } = await storeGet<WCProduct[]>("/products", { ...query, category: String(cat.id), per_page: 100, page: 1 });
      const all = data.filter(isWomenProduct);
      const per = q.perPage ?? PAGE_SIZE;
      const start = ((q.page ?? 1) - 1) * per;
      const pageList = all.slice(start, start + per);
      if (pageList.length <= 24) await attachCardSkus(pageList);
      cacheLife("hours");
      return { products: pageList, total: all.length, totalPages: Math.ceil(all.length / per) };
    }
    const { data, total, totalPages } = await storeGet<WCProduct[]>("/products", query);
    // Product cards show a SKU; skip for large internal lists (sitemap, prev/next) that don't render cards.
    if (data.length <= 24) await attachCardSkus(data);
    cacheLife("hours");
    return { products: data, total, totalPages };
  } catch (e) {
    console.error(e);
    cacheLife("seconds");
    return { products: [], total: 0, totalPages: 0 };
  }
}

/**
 * Sets `card_sku` on each product: the product's own SKU, or for variable products
 * the SKU of the first variation (in the store's order) that is in stock and purchasable.
 * One extra Store API request per 100 variations.
 */
async function attachCardSkus(list: WCProduct[]) {
  const ids = list.filter((p) => p.type === "variable").flatMap((p) => p.variations.map((v) => v.id));
  const info = new Map<number, { sku: string; ok: boolean }>();
  const chunks: number[][] = [];
  for (let i = 0; i < ids.length; i += 100) chunks.push(ids.slice(i, i + 100));
  await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const { data } = await storeGet<{ id: number; sku: string; is_in_stock: boolean; is_purchasable: boolean }[]>("/products", {
          type: "variation",
          include: chunk.join(","),
          per_page: 100,
          _fields: "id,sku,is_in_stock,is_purchasable",
        });
        data.forEach((v) => info.set(v.id, { sku: v.sku, ok: v.is_in_stock && v.is_purchasable }));
      } catch (e) {
        console.error(e);
      }
    }),
  );
  for (const p of list) {
    if (p.type === "variable") {
      const first = p.variations.find((r) => info.get(r.id)?.ok && info.get(r.id)?.sku);
      p.card_sku = first ? info.get(first.id)!.sku : p.sku;
    } else {
      p.card_sku = p.sku;
    }
  }
}

export async function getProductBySlug(slug: string): Promise<WCProduct | null> {
  "use cache";
  cacheTag("products", `product:${slug}`);
  try {
    const { data } = await storeGet<WCProduct[]>("/products", { slug, per_page: 1 });
    cacheLife("hours");
    return data[0] ?? null;
  } catch (e) {
    console.error(e);
    cacheLife("seconds");
    return null;
  }
}

/** Neighbouring products (by date) for the Previous / Next links. */
export async function getAdjacentProducts(product: WCProduct) {
  const catId = mainWomenCategory(product)?.slug;
  const list = await getProducts({ category: catId, perPage: 100, orderby: "date", order: "desc" });
  const i = list.products.findIndex((p) => p.id === product.id);
  if (i === -1) return { prev: null, next: null };
  return {
    prev: list.products[i - 1] ?? null,
    next: list.products[i + 1] ?? null,
  };
}

export async function getRelatedProducts(product: WCProduct, limit = 8) {
  const cat = mainWomenCategory(product);
  if (!cat) return [];
  const { products } = await getProducts({ category: cat.slug, perPage: limit + 1 });
  return products.filter((p) => p.id !== product.id).slice(0, limit);
}

/** Variation details (price, stock, image) for a variable product. */
export async function getVariations(slug: string, variationIds: number[]): Promise<WCProduct[]> {
  "use cache";
  cacheTag("products", `product:${slug}`);
  try {
    const ids = variationIds.slice(0, 40);
    const list = await Promise.all(ids.map((id) => storeGet<WCProduct>(`/products/${id}`).then((r) => r.data).catch(() => null)));
    cacheLife("hours");
    return list.filter(Boolean) as WCProduct[];
  } catch (e) {
    console.error(e);
    cacheLife("seconds");
    return [];
  }
}

// ---------- WordPress pages (About, policies) ----------

export type WPPage = { id: number; slug: string; title: { rendered: string }; content: { rendered: string } };

export async function getWpPage(slug: string): Promise<WPPage | null> {
  "use cache";
  cacheTag("pages", `page:${slug}`);
  try {
    const res = await fetch(buildUrl("/wp-json/wp/v2/pages", { slug, _fields: "id,slug,title,content" }), {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`pages ${res.status}`);
    const data = (await res.json()) as WPPage[];
    cacheLife("hours");
    return data[0] ?? null;
  } catch (e) {
    console.error(e);
    cacheLife("seconds");
    return null;
  }
}

// ---------- Admin REST API (uses keys; server-only) ----------

export async function adminGet(path: string, query: Query = {}) {
  const key = process.env.WC_CONSUMER_KEY;
  const secret = process.env.WC_CONSUMER_SECRET;
  if (!key || !secret) throw new Error("WooCommerce API keys are not set");
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  return fetch(buildUrl("/wp-json/wc/v3" + path, query), {
    headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
}

import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { HIDDEN_CATEGORY_SLUGS, PAGE_SIZE } from "./config";
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

async function storeGet<T>(path: string, query: Query = {}) {
  const res = await fetch(buildUrl(STORE + path, query), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
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

async function hiddenCategoryIds() {
  const cats = await getAllCategories();
  return cats.filter((c) => HIDDEN_CATEGORY_SLUGS.includes(c.slug)).map((c) => c.id);
}

// ---------- Products ----------

export type ProductQuery = {
  category?: string; // slug
  search?: string;
  page?: number;
  perPage?: number;
  orderby?: "date" | "price" | "popularity" | "rating" | "title" | "menu_order";
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
    const query: Query = {
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
    if (q.category) {
      const cat = await getCategory(q.category);
      if (!cat) {
        cacheLife("minutes");
        return { products: [], total: 0, totalPages: 0 };
      }
      query.category = String(cat.id);
    } else {
      const hidden = await hiddenCategoryIds();
      if (hidden.length) {
        query.category = hidden.join(",");
        query.category_operator = "not_in";
      }
    }
    const { data, total, totalPages } = await storeGet<WCProduct[]>("/products", query);
    cacheLife("hours");
    return { products: data, total, totalPages };
  } catch (e) {
    console.error(e);
    cacheLife("seconds");
    return { products: [], total: 0, totalPages: 0 };
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
  const catId = product.categories.find(
    (c) => !HIDDEN_CATEGORY_SLUGS.includes(c.slug),
  )?.slug;
  const list = await getProducts({ category: catId, perPage: 100, orderby: "date", order: "desc" });
  const i = list.products.findIndex((p) => p.id === product.id);
  if (i === -1) return { prev: null, next: null };
  return {
    prev: list.products[i - 1] ?? null,
    next: list.products[i + 1] ?? null,
  };
}

export async function getRelatedProducts(product: WCProduct, limit = 8) {
  const cat = product.categories.find((c) => !HIDDEN_CATEGORY_SLUGS.includes(c.slug));
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

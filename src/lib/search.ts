import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { after } from "next/server";
import { hiddenCategoryIds, storeGet } from "./woo";

/**
 * Catalogue search.
 * - Text: WooCommerce Store API `search` (product title, short description and
 *   description; case-insensitive, partial words).
 * - SKUs: WordPress search doesn't look at SKUs, so we keep an index of every
 *   product and variation SKU (shared remote cache, refreshed in the background).
 */

/** [sku, parentId, variationId (0 = the product itself), inStock (1/0)] */
export type SkuEntry = [string, number, number, number];

const MAX_RESULTS = 500;

export function normalizeTerm(q: string) {
  return q.trim().replace(/\s+/g, " ").slice(0, 100);
}

async function fetchAllPages<T>(path: string, query: Record<string, string | number>) {
  const first = await storeGet<T[]>(path, { ...query, page: 1 });
  const pages = Math.min(first.totalPages || 1, 200);
  const out: T[] = [...first.data];
  const rest = Array.from({ length: pages - 1 }, (_, i) => i + 2);
  // A few pages at a time, so the WordPress server isn't flooded.
  for (let i = 0; i < rest.length; i += 6) {
    const batch = await Promise.all(
      rest.slice(i, i + 6).map(async (page) => {
        try {
          return (await storeGet<T[]>(path, { ...query, page })).data;
        } catch {
          return (await storeGet<T[]>(path, { ...query, page })).data; // one retry
        }
      }),
    );
    batch.forEach((b) => out.push(...b));
  }
  return out;
}

/** Every product + variation SKU in the shop. Shared across all server instances. */
export async function getSkuIndex(): Promise<SkuEntry[]> {
  "use cache: remote";
  cacheTag("products", "sku-index");
  try {
    const hidden = await hiddenCategoryIds();
    const parentQuery: Record<string, string | number> = { per_page: 100, _fields: "id,sku,is_in_stock" };
    if (hidden.length) {
      parentQuery.category = hidden.join(",");
      parentQuery.category_operator = "not_in";
    }
    const [parents, variations] = await Promise.all([
      fetchAllPages<{ id: number; sku: string; is_in_stock: boolean }>("/products", parentQuery),
      fetchAllPages<{ id: number; parent: number; sku: string; is_in_stock: boolean }>("/products", {
        type: "variation",
        per_page: 100,
        _fields: "id,parent,sku,is_in_stock",
      }),
    ]);
    const live = new Set(parents.map((p) => p.id));
    const index: SkuEntry[] = [];
    for (const p of parents) if (p.sku) index.push([p.sku, p.id, 0, p.is_in_stock ? 1 : 0]);
    for (const v of variations) if (v.sku && live.has(v.parent)) index.push([v.sku, v.parent, v.id, v.is_in_stock ? 1 : 0]);
    // Serve for 5 min, refresh in the background every 6 h; WooCommerce webhooks can refresh sooner.
    cacheLife({ stale: 300, revalidate: 6 * 3600, expire: 7 * 86400 });
    return index;
  } catch (e) {
    console.error("SKU index failed", e);
    cacheLife("seconds");
    return [];
  }
}

/**
 * The SKU index, but don't make a shopper wait more than `ms` for it the first
 * time it's built — the build keeps running in the background and fills the cache.
 */
export async function getSkuIndexFast(ms = 3000): Promise<SkuEntry[] | null> {
  const p = getSkuIndex();
  after(() => p.then(() => undefined, () => undefined));
  return Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);
}

export type SkuHit = { parentId: number; variationId: number; sku: string; inStock: boolean; rank: number };

/** SKU matches, best per product: exact (0) › starts with (1) › contains (2). Case-insensitive. */
export function matchSkus(index: SkuEntry[], term: string): SkuHit[] {
  const t = term.toLowerCase().replace(/\s+/g, "");
  if (t.length < 2) return [];
  const best = new Map<number, SkuHit>();
  for (const [sku, parentId, variationId, inStock] of index) {
    const s = sku.toLowerCase();
    const at = s.indexOf(t);
    if (at === -1) continue;
    const rank = s === t ? 0 : at === 0 ? 1 : 2;
    const cur = best.get(parentId);
    // Prefer a better rank; on a tie prefer an in-stock variation.
    if (!cur || rank < cur.rank || (rank === cur.rank && inStock && !cur.inStock)) {
      best.set(parentId, { parentId, variationId, sku, inStock: inStock === 1, rank });
    }
  }
  return [...best.values()].sort((a, b) => a.rank - b.rank || a.sku.length - b.sku.length);
}

/** Ids of products whose title / descriptions match (Store API search), best first. */
export async function textSearchIds(term: string): Promise<number[]> {
  "use cache: remote";
  cacheTag("products");
  try {
    const hidden = await hiddenCategoryIds();
    const query: Record<string, string | number> = { search: term, per_page: 100, _fields: "id" };
    if (hidden.length) {
      query.category = hidden.join(",");
      query.category_operator = "not_in";
    }
    const ids: number[] = [];
    for (let page = 1; page <= MAX_RESULTS / 100; page++) {
      const { data, totalPages } = await storeGet<{ id: number }[]>("/products", { ...query, page });
      ids.push(...data.map((d) => d.id));
      if (page >= totalPages) break;
    }
    cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
    return ids;
  } catch (e) {
    console.error(e);
    cacheLife("seconds");
    return [];
  }
}

/**
 * Ordered product ids for a search: exact / starts-with SKU matches first,
 * then text matches, then other SKU matches. Capped at 500.
 */
export async function searchProductIds(rawTerm: string) {
  const term = normalizeTerm(rawTerm);
  if (!term) return { ids: [] as number[], skuHits: [] as SkuHit[] };
  const [text, index] = await Promise.all([textSearchIds(term), term.length >= 2 ? getSkuIndexFast(4000) : Promise.resolve(null)]);
  const skuHits = index ? matchSkus(index, term) : [];
  const ordered = [
    ...skuHits.filter((h) => h.rank < 2).map((h) => h.parentId),
    ...text,
    ...skuHits.filter((h) => h.rank === 2).map((h) => h.parentId),
  ];
  return { ids: [...new Set(ordered)].slice(0, MAX_RESULTS), skuHits };
}

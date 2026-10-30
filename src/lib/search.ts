import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { after } from "next/server";
import { storeGet, wpBase } from "./woo";

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One Store API page, with a generous timeout and up to 3 retries (the WordPress server can be slow). */
async function getPage<T>(path: string, query: Record<string, string | number>) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await storeGet<T[]>(path, query, 40000);
    } catch (e) {
      if (attempt >= 3) throw e;
      await sleep(1500 * (attempt + 1));
    }
  }
}

/** All pages of a listing, 3 at a time so WordPress isn't overloaded. Pages that still fail are counted. */
async function fetchAllPages<T>(path: string, query: Record<string, string | number>) {
  const first = await getPage<T>(path, { ...query, page: 1 });
  const pages = Math.min(first.totalPages || 1, 200);
  const out: T[] = [...first.data];
  let failed = 0;
  const rest = Array.from({ length: pages - 1 }, (_, i) => i + 2);
  for (let i = 0; i < rest.length; i += 3) {
    const batch = await Promise.all(
      rest.slice(i, i + 3).map((page) =>
        getPage<T>(path, { ...query, page }).then(
          (r) => r.data,
          () => {
            failed++;
            return [] as T[];
          },
        ),
      ),
    );
    batch.forEach((b) => out.push(...b));
  }
  return { items: out, failed };
}

// Only one index build at a time per server instance.
let building: Promise<{ index: SkuEntry[]; complete: boolean }> | null = null;

// Last full index built or received on this server instance (survives between requests on the same instance).
let local: { index: SkuEntry[]; at: number } | null = null;

async function buildIndex() {
  const t0 = Date.now();
  // Published products only (the Store API never returns drafts); their variations are kept via `live` below.
  const parentQuery: Record<string, string | number> = { per_page: 100, _fields: "id,sku,is_in_stock" };
  const parents = await fetchAllPages<{ id: number; sku: string; is_in_stock: boolean }>("/products", parentQuery);
  const variations = await fetchAllPages<{ id: number; parent: number; sku: string; is_in_stock: boolean }>("/products", {
    type: "variation",
    per_page: 100,
    _fields: "id,parent,sku,is_in_stock",
  });
  const live = new Set(parents.items.map((p) => p.id));
  const index: SkuEntry[] = [];
  for (const p of parents.items) if (p.sku) index.push([p.sku, p.id, 0, p.is_in_stock ? 1 : 0]);
  for (const v of variations.items) if (v.sku && live.has(v.parent)) index.push([v.sku, v.parent, v.id, v.is_in_stock ? 1 : 0]);
  const complete = parents.failed === 0 && variations.failed === 0;
  console.log(`SKU index built: ${index.length} entries in ${Math.round((Date.now() - t0) / 1000)}s${complete ? "" : " (incomplete)"}`);
  if (complete) local = { index, at: Date.now() };
  return { index, complete };
}

/** Every product + variation SKU in the shop. Shared across all server instances. */
// Named for published-only data so cached indexes from earlier versions are never reused.
export async function getPublishedSkuIndex(): Promise<SkuEntry[]> {
  "use cache: remote";
  cacheTag("products", "sku-index");
  try {
    building ??= buildIndex().finally(() => (building = null));
    const { index, complete } = await building;
    if (complete) {
      // Serve for 5 min, refresh in the background every 6 h; WooCommerce webhooks can refresh sooner.
      cacheLife({ stale: 300, revalidate: 6 * 3600, expire: 7 * 86400 });
    } else {
      // Some pages failed: use what we have, but try again soon.
      console.error(`SKU index incomplete (${index.length} entries)`);
      cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
    }
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
  const p = getPublishedSkuIndex().then((idx) => {
    if (idx.length) local = { index: idx, at: Date.now() };
    return idx;
  });
  after(() => p.then(() => undefined, () => undefined));
  const got = await Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);
  if (got && got.length) return got;
  // Shared cache not ready yet: use this instance's copy if it has one (refreshed within 12 h).
  if (local && Date.now() - local.at < 12 * 3600 * 1000) return local.index;
  console.log("SKU index not ready yet; text results only");
  return got;
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
export async function publishedTextSearchIds(term: string): Promise<number[]> {
  "use cache: remote";
  cacheTag("products");
  try {
    // Newest matching products first.
    const query: Record<string, string | number> = { search: term, per_page: 100, _fields: "id", orderby: "date", order: "desc" };
    const ids: number[] = [];
    for (let page = 1; page <= MAX_RESULTS / 100; page++) {
      const { data, totalPages } = await getPage<{ id: number }>("/products", { ...query, page });
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
 * For multi-word searches: products containing every word in any order
 * (WooCommerce's own search only matches the words as one phrase).
 */
export async function allWordsIds(term: string): Promise<number[]> {
  const words = [...new Set(term.toLowerCase().split(" ").filter((w) => w.length >= 2))].slice(0, 4);
  if (words.length < 2) return [];
  const lists = await Promise.all(words.map((w) => publishedTextSearchIds(w)));
  const sets = lists.slice(1).map((l) => new Set(l));
  return lists[0].filter((id) => sets.every((st) => st.has(id)));
}

/**
 * Ordered product ids for a search: exact / starts-with SKU matches first,
 * then exact-phrase text matches, then all-words matches, then other SKU matches. Capped at 500.
 */
export async function searchProductIds(rawTerm: string) {
  const term = normalizeTerm(rawTerm);
  if (!term) return { ids: [] as number[], skuHits: [] as SkuHit[] };
  const [text, words, index] = await Promise.all([
    publishedTextSearchIds(term),
    allWordsIds(term),
    term.length >= 2 ? getSkuIndexFast(4000) : Promise.resolve(null),
  ]);
  const skuHits = index ? matchSkus(index, term) : [];
  const ordered = [
    ...skuHits.filter((h) => h.rank < 2).map((h) => h.parentId),
    ...text,
    ...words,
    ...skuHits.filter((h) => h.rank === 2).map((h) => h.parentId),
  ];
  return { ids: [...new Set(ordered)].slice(0, MAX_RESULTS), skuHits };
}

export type SearchFilters = {
  /** Category ids to limit to (optional). */
  categoryIds?: number[];
  minPrice?: number;
  maxPrice?: number;
  onSale?: boolean;
  inStock?: boolean;
  sort: "featured" | "newest" | "price-asc" | "price-desc" | "popular" | "name";
  /** Ids kept at the very top when sorting by newest/relevance (exact SKU matches). */
  pinned?: number[];
};

/** Publication date (ms) of published products, from WordPress (the Store API doesn't include dates). */
async function publishDates(ids: number[]): Promise<Map<number, number>> {
  const out = new Map<number, number>();
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const res = await fetch(`${wpBase()}/wp-json/wp/v2/product?include=${chunk.join(",")}&per_page=100&_fields=id,date_gmt`, {
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`product dates ${res.status}`);
    for (const r of (await res.json()) as { id: number; date_gmt: string }[]) out.set(r.id, Date.parse(r.date_gmt + "Z"));
  }
  return out;
}

/**
 * Apply shop filters and sorting to a search's product ids. WordPress can't take
 * hundreds of ids in one request, so this asks in batches of 50 and returns ids only.
 * "featured" and "popular" keep search relevance order (WooCommerce doesn't expose sales counts);
 * "newest" sorts by the WordPress publication date (newest first, product id breaks ties).
 * Exact SKU matches (`pinned`) stay on top for newest/relevance.
 */
export async function filterSearchIds(ids: number[], f: SearchFilters): Promise<number[]> {
  "use cache";
  cacheTag("products");
  if (!ids.length) {
    cacheLife("hours");
    return ids;
  }
  try {
    const scope = f.categoryIds?.length ? { category: f.categoryIds.join(",") } : {};
    type Row = { id: number; name: string; prices: { price: string } };
    const chunks: number[][] = [];
    for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50));
    const rows: Row[] = [];
    for (let i = 0; i < chunks.length; i += 3) {
      const got = await Promise.all(
        chunks.slice(i, i + 3).map((chunk) =>
          storeGet<Row[]>("/products", {
            include: chunk.join(","),
            per_page: 100,
            _fields: "id,name,prices",
            ...scope,
            min_price: f.minPrice !== undefined ? f.minPrice * 100 : undefined,
            max_price: f.maxPrice !== undefined ? f.maxPrice * 100 : undefined,
            on_sale: f.onSale ? true : undefined,
            stock_status: f.inStock ? ["instock"] : undefined,
          }).then((r) => r.data),
        ),
      );
      got.forEach((g) => rows.push(...g));
    }
    const pos = new Map(ids.map((id, i) => [id, i]));
    const dates = f.sort === "newest" ? await publishDates(rows.map((r) => r.id)) : new Map<number, number>();
    const price = (r: Row) => Number(r.prices?.price ?? 0);
    const sorters: Record<SearchFilters["sort"], (a: Row, b: Row) => number> = {
      featured: (a, b) => pos.get(a.id)! - pos.get(b.id)!,
      popular: (a, b) => pos.get(a.id)! - pos.get(b.id)!,
      newest: (a, b) => (dates.get(b.id) ?? 0) - (dates.get(a.id) ?? 0) || b.id - a.id,
      "price-asc": (a, b) => price(a) - price(b),
      "price-desc": (a, b) => price(b) - price(a),
      name: (a, b) => a.name.localeCompare(b.name),
    };
    rows.sort(sorters[f.sort]);
    let out = rows.map((r) => r.id);
    if (f.pinned?.length && (f.sort === "newest" || f.sort === "featured")) {
      const present = new Set(out);
      const top = f.pinned.filter((id) => present.has(id));
      const topSet = new Set(top);
      out = [...top, ...out.filter((id) => !topSet.has(id))];
    }
    cacheLife({ stale: 60, revalidate: 600, expire: 86400 });
    return out;
  } catch (e) {
    console.error(e);
    cacheLife("seconds");
    return [];
  }
}

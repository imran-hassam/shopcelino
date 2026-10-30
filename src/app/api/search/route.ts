import { allWordsIds, getSkuIndexFast, matchSkus, normalizeTerm, type SkuEntry } from "@/lib/search";
import { storeGet, womenOnlyQuery } from "@/lib/woo";
import { decodeEntities, formatMoney } from "@/lib/format";
import type { WCPrices, WCProduct } from "@/lib/types";

/** Live search suggestions: up to 10 products matching title, descriptions or any SKU. */
export type Suggestion = { id: number; name: string; sku: string; price: string; image: string | null; href: string };

const LIMIT = 10;
// The first request after a deploy also builds the SKU index in the background (see lib/search.ts).
export const maxDuration = 300;
const FIELDS = "id,name,slug,sku,type,prices,images,variations";

type Lite = Pick<WCProduct, "id" | "name" | "slug" | "sku" | "type" | "prices" | "images" | "variations">;
type Var = { id: number; parent: number; sku: string; prices: WCPrices; images: WCProduct["images"] };

export async function GET(req: Request) {
  const term = normalizeTerm(new URL(req.url).searchParams.get("q") ?? "");
  if (term.length < 2) return Response.json({ items: [] });

  try {
    // Women's products only (see WOMEN_CATEGORY_SLUGS in lib/config.ts).
    const women = await womenOnlyQuery();

    const [text, words, index] = await Promise.all([
      storeGet<Lite[]>("/products", { search: term, per_page: LIMIT, _fields: FIELDS, ...women }).then((r) => r.data).catch(() => [] as Lite[]),
      allWordsIds(term),
      getSkuIndexFast(2500),
    ]);
    const hits = index ? matchSkus(index, term) : [];

    // Order: exact / starts-with SKU › phrase matches › all-words matches › other SKU matches.
    type Slot = { id: number; variationId: number; sku?: string; inStock?: boolean };
    const slots: Slot[] = [];
    const seen = new Set<number>();
    const push = (s: Slot) => {
      if (slots.length < LIMIT && !seen.has(s.id)) {
        seen.add(s.id);
        slots.push(s);
      }
    };
    hits.filter((h) => h.rank < 2).forEach((h) => push({ id: h.parentId, variationId: h.variationId, sku: h.sku, inStock: h.inStock }));
    text.forEach((p) => push({ id: p.id, variationId: 0 }));
    words.forEach((id) => push({ id, variationId: 0 }));
    hits.filter((h) => h.rank === 2).forEach((h) => push({ id: h.parentId, variationId: h.variationId, sku: h.sku, inStock: h.inStock }));

    // Fetch details for SKU matches that weren't in the text results, plus matched variations.
    const byId = new Map(text.map((p) => [p.id, p]));
    const missing = slots.filter((s) => !byId.has(s.id)).map((s) => s.id);
    const varIds = slots.filter((s) => s.variationId).map((s) => s.variationId);
    const [more, vars] = await Promise.all([
      missing.length
        ? storeGet<Lite[]>("/products", { include: missing.join(","), per_page: LIMIT, _fields: FIELDS, ...women }).then((r) => r.data).catch(() => [] as Lite[])
        : Promise.resolve([] as Lite[]),
      varIds.length
        ? storeGet<Var[]>("/products", { type: "variation", include: varIds.join(","), per_page: LIMIT, _fields: "id,parent,sku,prices,images" }).then((r) => r.data).catch(() => [] as Var[])
        : Promise.resolve([] as Var[]),
    ]);
    more.forEach((p) => byId.set(p.id, p));
    const varById = new Map(vars.map((v) => [v.id, v]));
    let varIndex = index ? new Map(index.filter((e) => e[2]).map((e) => [e[2], e] as [number, SkuEntry])) : null;
    if (!varIndex) {
      // Index still building: look up just these products' variations.
      const need = slots
        .filter((s) => !s.sku)
        .flatMap((s) => (byId.get(s.id)?.type === "variable" ? byId.get(s.id)!.variations.map((r) => r.id) : []))
        .slice(0, 100);
      if (need.length) {
        const list = await storeGet<{ id: number; parent: number; sku: string; is_in_stock: boolean; is_purchasable: boolean }[]>("/products", {
          type: "variation",
          include: need.join(","),
          per_page: 100,
          _fields: "id,parent,sku,is_in_stock,is_purchasable",
        })
          .then((r) => r.data)
          .catch(() => []);
        varIndex = new Map(list.map((v) => [v.id, [v.sku, v.parent, v.id, v.is_in_stock && v.is_purchasable ? 1 : 0] as SkuEntry]));
      }
    }

    const items: Suggestion[] = [];
    for (const s of slots) {
      const p = byId.get(s.id);
      if (!p) continue;
      const v = s.variationId ? varById.get(s.variationId) : undefined;
      const prices = v?.prices ?? p.prices;
      const range = !v && p.prices.price_range && p.prices.price_range.min_amount !== p.prices.price_range.max_amount ? p.prices.price_range : null;
      items.push({
        id: p.id,
        name: decodeEntities(p.name),
        sku: s.sku ?? displaySku(p, varIndex),
        price: range ? `${formatMoney(range.min_amount, prices)} – ${formatMoney(range.max_amount, prices)}` : formatMoney(prices.price, prices),
        image: v?.images?.[0]?.thumbnail ?? p.images[0]?.thumbnail ?? null,
        // Open the matched variation pre-selected (only if it can be bought).
        href: `/product/${p.slug}${s.variationId && s.inStock ? `?variation=${s.variationId}` : ""}`,
      });
    }

    return Response.json(
      { items },
      { headers: { "Cache-Control": index ? "public, s-maxage=600, stale-while-revalidate=86400" : "public, s-maxage=30" } },
    );
  } catch (e) {
    console.error(e);
    return Response.json({ items: [] }, { status: 502 });
  }
}

/** Same rule as product cards: first in-stock variation's SKU, else the product SKU. */
function displaySku(p: Lite, varIndex: Map<number, SkuEntry> | null) {
  if (p.type === "variable" && varIndex) {
    for (const r of p.variations) {
      const e = varIndex.get(r.id);
      if (e && e[3] && e[0]) return e[0];
    }
  }
  return p.sku;
}

import { connection } from "next/server";
import { wpBase } from "@/lib/woo";

// TEMPORARY read-only diagnostics (preview branch only). Returns summaries, no secrets.
async function j(path: string) {
  const t0 = Date.now();
  try {
    const r = await fetch(wpBase() + "/wp-json/wc/store/v1" + path, { cache: "no-store", signal: AbortSignal.timeout(25000) });
    const body = await r.json().catch(() => null);
    return { status: r.status, ms: Date.now() - t0, total: r.headers.get("x-wp-total"), pages: r.headers.get("x-wp-totalpages"), body };
  } catch (e) {
    return { status: 0, ms: Date.now() - t0, error: (e as Error).message, body: null };
  }
}
const pick = (o: Record<string, unknown>, keys: string[]) => Object.fromEntries(keys.map((k) => [k, o?.[k]]));

export async function GET() {
  await connection();
  const out: Record<string, unknown> = {};
  const v = await j("/products?type=variation&per_page=5");
  out.variations = { ...v, body: Array.isArray(v.body) ? v.body.map((x: Record<string, unknown>) => ({ ...pick(x, ["id", "parent", "type", "name", "sku", "variation", "is_in_stock", "is_purchasable"]), price: (x.prices as { price?: string })?.price, imgs: (x.images as unknown[])?.length, attrs: x.attributes })) : v.body };
  const f = await j("/products?type=variation&per_page=3&_fields=id,parent,sku,is_in_stock");
  out.fieldsFilter = { status: f.status, ms: f.ms, sample: f.body };
  const p = await j("/products?per_page=2&_fields=id,sku,variations,type");
  out.parentFields = { status: p.status, sample: p.body };
  const firstVar = Array.isArray(v.body) && v.body[0] ? (v.body[0] as { sku: string; parent: number; id: number }) : null;
  if (firstVar) {
    const s = await j(`/products?search=${encodeURIComponent(firstVar.sku.slice(0, 6))}&per_page=3&_fields=id,name,sku`);
    out.searchBySkuPrefix = { term: firstVar.sku.slice(0, 6), status: s.status, total: s.total, sample: s.body };
    const inc = await j(`/products?type=variation&include=${firstVar.id}&_fields=id,sku`);
    out.includeVariation = { status: inc.status, sample: inc.body };
    const incNoType = await j(`/products?include=${firstVar.id}&_fields=id,sku`);
    out.includeVariationNoType = { status: incNoType.status, sample: incNoType.body };
  }
  const ord = await j("/products?per_page=2&include=14407,14405&orderby=include&_fields=id");
  out.orderbyInclude = { status: ord.status, body: ord.body };
  const allVarPages = await j("/products?type=variation&per_page=100&_fields=id");
  out.variationCount = { total: allVarPages.total, pages: allVarPages.pages, ms: allVarPages.ms };
  const allParents = await j("/products?per_page=100&_fields=id");
  out.parentCount = { total: allParents.total, pages: allParents.pages, ms: allParents.ms };
  const big = await j("/products?type=variation&per_page=100&_fields=id,parent,sku,is_in_stock");
  out.bigPageMs = big.ms;
  return Response.json(out);
}

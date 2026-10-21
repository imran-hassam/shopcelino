import { connection } from "next/server";
import { adminGet, wpBase } from "@/lib/woo";

/** Connection check. Returns only yes/no and counts — never keys or raw data. */
export async function GET() {
  await connection();
  const result: Record<string, unknown> = {
    wordpressUrlSet: Boolean(process.env.WORDPRESS_URL),
    consumerKeySet: Boolean(process.env.WC_CONSUMER_KEY),
    consumerSecretSet: Boolean(process.env.WC_CONSUMER_SECRET),
  };
  try {
    const base = wpBase();
    const p = await fetch(`${base}/wp-json/wc/store/v1/products?per_page=1`, { cache: "no-store" });
    const sample = p.ok ? ((await p.json()) as { prices?: { price?: string }; images?: unknown[] }[])[0] : null;
    result.storeApi = {
      ok: p.ok,
      status: p.status,
      totalProducts: Number(p.headers.get("x-wp-total") ?? 0),
      sampleHasPrice: Boolean(sample?.prices?.price),
      sampleImageCount: sample?.images?.length ?? 0,
    };
    const c = await fetch(`${base}/wp-json/wc/store/v1/products/categories?per_page=1`, { cache: "no-store" });
    result.categories = { ok: c.ok, total: Number(c.headers.get("x-wp-total") ?? 0) };
    const cart = await fetch(`${base}/wp-json/wc/store/v1/cart`, { cache: "no-store" });
    result.cartApi = { ok: cart.ok, cartTokenIssued: Boolean(cart.headers.get("cart-token")) };
  } catch (e) {
    result.storeApi = { ok: false, error: (e as Error).message };
  }
  try {
    const a = await adminGet("/products", { per_page: 1, _fields: "id" });
    result.adminApiWithKeys = { ok: a.ok, status: a.status };
  } catch (e) {
    result.adminApiWithKeys = { ok: false, error: (e as Error).message };
  }
  try {
    const g = await adminGet("/payment_gateways");
    const list = g.ok ? ((await g.json()) as { id: string; enabled: boolean }[]) : [];
    result.paymentGateways = { ok: g.ok, status: g.status, enabled: list.filter((x) => x.enabled).map((x) => x.id) };
  } catch (e) {
    result.paymentGateways = { ok: false, error: (e as Error).message };
  }
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}

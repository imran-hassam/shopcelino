import { cookies } from "next/headers";
import { wpBase } from "@/lib/woo";

/**
 * Proxies cart + checkout calls to the WooCommerce Store API.
 * The Cart-Token lives in an httpOnly cookie, so the browser never sees it.
 */
const COOKIE = "sc_cart";
const POST_ACTIONS = new Set([
  "add-item",
  "update-item",
  "remove-item",
  "apply-coupon",
  "remove-coupon",
  "update-customer",
  "select-shipping-rate",
  "checkout",
]);

async function forward(method: "GET" | "POST", action: string | null, body?: string) {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  const path = action === "checkout" ? "/checkout" : action ? `/cart/${action}` : "/cart";
  const res = await fetch(`${wpBase()}/wp-json/wc/store/v1${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { "Cart-Token": token } : {}),
    },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  const newToken = res.headers.get("cart-token");
  if (newToken && newToken !== token) {
    store.set(COOKIE, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
  }
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

type Ctx = { params: Promise<{ action?: string[] }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { action } = await params;
  if (action?.length) return Response.json({ message: "Not found" }, { status: 404 });
  try {
    return await forward("GET", null);
  } catch {
    return Response.json({ message: "Store is unreachable" }, { status: 502 });
  }
}

export async function POST(req: Request, { params }: Ctx) {
  const { action } = await params;
  const name = action?.join("/") ?? "";
  if (!POST_ACTIONS.has(name)) return Response.json({ message: "Not found" }, { status: 404 });
  const body = await req.text();
  if (body.length > 20000) return Response.json({ message: "Too large" }, { status: 413 });
  try {
    return await forward("POST", name, body);
  } catch {
    return Response.json({ message: "Store is unreachable" }, { status: 502 });
  }
}

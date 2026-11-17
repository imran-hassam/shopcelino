import type { NextRequest } from "next/server";
import { wpBase } from "@/lib/woo";

/**
 * Same-origin pass-through for WooCommerce product photos, so the gallery can read
 * their pixels (the WordPress host sends no CORS headers) to lift the white studio
 * background in the browser. The file is passed through byte for byte — nothing is
 * re-encoded or stored — and only images under /wp-content/uploads/ are allowed.
 * Responses are cached at Vercel's edge for a year, so each photo is fetched once.
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("src") ?? "";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return new Response("Bad src", { status: 400 });
  }
  const allowed = new Set([new URL(wpBase()).host, "shopcelino.com", "www.shopcelino.com"]);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    !allowed.has(url.host) ||
    !url.pathname.startsWith("/wp-content/uploads/") ||
    !/\.(jpe?g|png|webp)$/i.test(url.pathname)
  ) {
    return new Response("Not allowed", { status: 403 });
  }

  const upstream = await fetch(url, { cache: "no-store" }).catch(() => null);
  if (!upstream || !upstream.ok || !upstream.body) {
    return new Response("Not found", { status: upstream?.status === 404 ? 404 : 502 });
  }
  const type = upstream.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) return new Response("Not an image", { status: 415 });

  return new Response(upstream.body, {
    headers: {
      "content-type": type,
      ...(upstream.headers.get("content-length") ? { "content-length": upstream.headers.get("content-length")! } : {}),
      "cache-control": "public, max-age=31536000, s-maxage=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}

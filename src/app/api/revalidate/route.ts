import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";

/**
 * Clears cached store data so changes in WooCommerce show up right away.
 * - WooCommerce webhooks: set the webhook "Secret" to REVALIDATE_SECRET; we verify its signature.
 * - Manual: POST /api/revalidate?secret=REVALIDATE_SECRET
 */
export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return Response.json({ ok: false }, { status: 500 });

  const body = await req.text();
  const signature = req.headers.get("x-wc-webhook-signature");
  const url = new URL(req.url);

  let authorized = false;
  if (signature) {
    const expected = createHmac("sha256", secret).update(body).digest("base64");
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    authorized = a.length === b.length && timingSafeEqual(a, b);
  } else if (url.searchParams.get("secret")) {
    const a = Buffer.from(url.searchParams.get("secret")!);
    const b = Buffer.from(secret);
    authorized = a.length === b.length && timingSafeEqual(a, b);
  }
  // WooCommerce sends an unsigned ping when a webhook is first saved.
  if (!authorized && body.startsWith("webhook_id=")) return Response.json({ ok: true });
  if (!authorized) return Response.json({ ok: false }, { status: 401 });

  for (const tag of ["products", "categories", "pages"]) revalidateTag(tag, "max");
  return Response.json({ ok: true, revalidated: true });
}

import { connection } from "next/server";
import { getMegaMenu } from "@/lib/mega";

/**
 * SHOP mega menu data, loaded by the header on first hover. Built per request (never baked in at
 * build time) and cached at the edge for 10 minutes once complete, so menu categories follow WooCommerce.
 */
export async function GET() {
  await connection();
  try {
    const data = await getMegaMenu();
    const complete = data.categories.length > 0 && data.categories.every((c) => c.image) && data.products.length === 3;
    return Response.json(data, {
      headers: { "Cache-Control": complete ? "public, s-maxage=600, stale-while-revalidate=3600" : "no-store" },
    });
  } catch {
    return Response.json(null, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}

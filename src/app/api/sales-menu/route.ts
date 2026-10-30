import { connection } from "next/server";
import { getSalesMenu } from "@/lib/mega";

/**
 * "Today's Sales" mega menu data, loaded by the header on first open.
 * Built per request (never baked in at build time, when WordPress may be slow) and cached
 * at the edge only once the result is complete.
 */
export async function GET() {
  await connection();
  try {
    const data = await getSalesMenu();
    const complete = data.categories.length > 0 && data.categories.every((c) => c.image) && data.products.length > 0;
    return Response.json(data, {
      headers: { "Cache-Control": complete ? "public, s-maxage=600, stale-while-revalidate=3600" : "no-store" },
    });
  } catch {
    return Response.json(null, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}

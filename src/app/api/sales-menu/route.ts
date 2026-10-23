import { getSalesMenu } from "@/lib/mega";

/** "Today's Sales" mega menu data, loaded by the header on first open. Cached at the edge. */
export async function GET() {
  try {
    const data = await getSalesMenu();
    const complete = data.categories.length === 8 && data.categories.every((c) => c.image) && data.products.length === 6;
    return Response.json(data, {
      headers: { "Cache-Control": complete ? "public, s-maxage=1800, stale-while-revalidate=86400" : "public, s-maxage=60" },
    });
  } catch {
    return Response.json(null, { status: 502 });
  }
}

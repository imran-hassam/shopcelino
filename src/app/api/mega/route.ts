import { getMegaMenu } from "@/lib/mega";

/** SHOP mega menu data, loaded by the header on first hover. Cached at the edge. */
export async function GET() {
  try {
    const data = await getMegaMenu();
    const complete = data.categories.length === 5 && data.categories.every((c) => c.image) && data.products.length === 3;
    return Response.json(data, {
      headers: { "Cache-Control": complete ? "public, s-maxage=3600, stale-while-revalidate=86400" : "public, s-maxage=60" },
    });
  } catch {
    return Response.json(null, { status: 502 });
  }
}

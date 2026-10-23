import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { SITE, MENU_CATEGORIES } from "@/lib/config";
import { getProducts } from "@/lib/woo";

// Built on request (not during deploy) so a slow WordPress server can't fail the build.
// Product lists are still cached by getProducts().
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const base = SITE.url;
  const pages: MetadataRoute.Sitemap = ["", "/shop", "/about", "/contact"].map((p) => ({ url: `${base}${p}` }));
  const cats = MENU_CATEGORIES.map((c) => ({ url: `${base}/shop?category=${c.slug}` }));
  const products: MetadataRoute.Sitemap = [];
  for (let page = 1; page <= 30; page++) {
    const { products: list, totalPages } = await getProducts({ page, perPage: 100, orderby: "date", order: "desc" });
    products.push(...list.map((p) => ({ url: `${base}/product/${p.slug}` })));
    if (page >= totalPages) break;
  }
  return [...pages, ...cats, ...products];
}

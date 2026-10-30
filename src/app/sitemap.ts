import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { FILTER_CATEGORY_SLUGS, SITE, WOMEN_COLLECTIONS } from "@/lib/config";
import { getAllCategories, getProducts } from "@/lib/woo";

// Built on request (not during deploy) so a slow WordPress server can't fail the build.
// Product lists are still cached by getProducts(), which only returns women's products,
// so men's / kids' items can never appear here.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const base = SITE.url;
  const pages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/todays-sales`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.4 },
  ];
  const cats = await getAllCategories();
  const catSlugs = [
    ...Object.keys(WOMEN_COLLECTIONS),
    ...FILTER_CATEGORY_SLUGS.filter((slug) => (cats.find((c) => c.slug === slug)?.count ?? 0) > 0),
  ];
  const catUrls: MetadataRoute.Sitemap = catSlugs.map((slug) => ({ url: `${base}/shop?category=${slug}`, changeFrequency: "weekly", priority: 0.7 }));
  const products: MetadataRoute.Sitemap = [];
  for (let page = 1; page <= 30; page++) {
    const { products: list, totalPages } = await getProducts({ page, perPage: 100, orderby: "date", order: "desc" });
    products.push(...list.map((p) => ({ url: `${base}/product/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.6 })));
    if (page >= totalPages) break;
  }
  return [...pages, ...catUrls, ...products];
}

import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { SITE } from "@/lib/config";
import { getActiveCategories, getPublishedProductSlugs } from "@/lib/woo";

// Built on request (not during deploy) so a slow WordPress server can't fail the build.
// Only published products and categories that currently have published products are listed,
// so drafts drop out automatically when the cached data refreshes (every 10 minutes).
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
  const cats = await getActiveCategories();
  const catUrls: MetadataRoute.Sitemap = cats.map((c) => ({ url: `${base}/shop?category=${c.slug}`, changeFrequency: "weekly", priority: 0.7 }));
  const products: MetadataRoute.Sitemap = (await getPublishedProductSlugs()).map((p) => ({
    url: `${base}/product/${p.slug}`,
    lastModified: p.modified ? new Date(p.modified + "Z") : undefined,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));
  return [...pages, ...catUrls, ...products];
}

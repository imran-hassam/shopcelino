import type { MetadataRoute } from "next";
import { SITE } from "@/lib/config";

// Search engines are blocked until ALLOW_INDEXING=true is set at launch.
export default function robots(): MetadataRoute.Robots {
  if (process.env.ALLOW_INDEXING !== "true") return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/cart", "/checkout", "/order-received"] },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}

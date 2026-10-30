import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getAllCategories, storeGet } from "./woo";

/**
 * Data for the homepage "Fit & Style Guide" — real sizes taken from the store's own products
 * (no invented measurements). Sizes are stored per product in WooCommerce, so each guide tab
 * looks at the newest products in its categories and lists the sizes they are offered in.
 */

export type SizeRow = { size: string; alsoShownAs: string | null; share: number };
export type SizeTab = { key: string; label: string; shopHref: string; sampled: number; rows: SizeRow[] };

const TABS: { key: string; label: string; slugs: string[]; shopSlug: string }[] = [
  { key: "dresses-tops", label: "Dresses & Tops", slugs: ["womens-dresses", "womens-blouses"], shopSlug: "womens-dresses" },
  { key: "lingerie", label: "Lingerie", slugs: ["womens-lingerie"], shopSlug: "womens-lingerie" },
  { key: "sleepwear", label: "Sleepwear", slugs: ["women-sleepwear"], shopSlug: "women-sleepwear" },
];

/** Same size, two spellings — both are used in the store. */
const SAME_SIZE: Record<string, string> = { XXL: "2XL", XXXL: "3XL", XXXXL: "4XL", "2XL": "XXL", "3XL": "XXXL", "4XL": "XXXXL" };
const ORDER = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL", "5XL", "6XL", "ONE SIZE"];

/** Put one spelling per size (e.g. 4XL and XXXXL are the same size), in size order. */
function canonical(name: string) {
  const n = name.trim().toUpperCase().replace(/\s+/g, " ");
  if (n === "ONESIZE" || n === "ONE SIZE" || n === "FREE SIZE") return "ONE SIZE";
  if (n === "2XL") return "XXL";
  if (n === "3XL") return "XXXL";
  if (n === "4XL") return "XXXXL";
  return n;
}
function display(c: string) {
  return c === "ONE SIZE" ? "One Size" : c;
}

export async function getSizeGuide(): Promise<SizeTab[]> {
  "use cache";
  cacheTag("products", "size-guide");
  try {
    const cats = await getAllCategories();
    const tabs = await Promise.all(
      TABS.map(async (t) => {
        const ids = cats.filter((c) => t.slugs.includes(c.slug) && c.count > 0).map((c) => c.id);
        if (!ids.length) return null;
        // Newest 40 products in these categories (published only); only their size options are read.
        const { data } = await storeGet<{ id: number; attributes: { name: string; terms: { name: string }[] }[] }[]>("/products", {
          category: ids.join(","),
          per_page: 40,
          orderby: "date",
          order: "desc",
          _fields: "id,attributes",
        });
        const counts = new Map<string, number>();
        let sampled = 0;
        for (const p of data) {
          const attr = p.attributes.find((a) => /size/i.test(a.name));
          if (!attr) continue;
          sampled++;
          const seen = new Set(attr.terms.map((x) => canonical(x.name)));
          seen.forEach((s) => counts.set(s, (counts.get(s) ?? 0) + 1));
        }
        if (!sampled) return null;
        const rows: SizeRow[] = [...counts.entries()]
          .sort((a, b) => {
            const ia = ORDER.indexOf(a[0]);
            const ib = ORDER.indexOf(b[0]);
            return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a[0].localeCompare(b[0]);
          })
          .map(([size, n]) => ({ size: display(size), alsoShownAs: SAME_SIZE[size] ?? null, share: n / sampled }));
        return { key: t.key, label: t.label, shopHref: `/shop?category=${t.shopSlug}`, sampled, rows };
      }),
    );
    const out = tabs.filter((t): t is SizeTab => !!t);
    if (out.length === TABS.length) cacheLife("hours");
    else cacheLife("minutes");
    return out;
  } catch (e) {
    console.error(e);
    cacheLife("seconds");
    return [];
  }
}

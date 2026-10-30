import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getAllCategories, getProducts, type ProductQuery } from "@/lib/woo";
import { FILTER_CATEGORY_SLUGS, PAGE_SIZE, SITE, WOMEN_COLLECTIONS, categoryLabel, isShopCategory } from "@/lib/config";
import { decodeEntities, stripHtml } from "@/lib/format";
import type { WCCategory } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";
import { ShopFilters } from "@/components/ShopFilters";
import { PageHero, PageHeroSkeleton, type Crumb } from "@/components/PageHero";
import { filterSearchIds, searchProductIds, type SearchFilters } from "@/lib/search";
import { SortSelect } from "@/components/SortSelect";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** A women's category or women's collection (e.g. Best Sellers) shoppers can browse, with its WooCommerce ids. */
type ShopCat = { slug: string; label: string; ids: number[]; description: string };

async function resolveShopCategory(slug: string): Promise<ShopCat | null> {
  if (!slug || !isShopCategory(slug)) return null;
  const cats = await getAllCategories();
  const collection = WOMEN_COLLECTIONS[slug];
  const found = cats.filter((c) => (collection ? collection.slugs.includes(c.slug) : c.slug === slug));
  if (!found.length) return null;
  const wc: WCCategory | undefined = collection ? undefined : found[0];
  return {
    slug,
    label: collection ? collection.label : categoryLabel(slug, decodeEntities(wc!.name)),
    ids: found.map((c) => c.id),
    description: wc?.description ? stripHtml(wc.description) : "",
  };
}

/** Meta description for a category page — plain and accurate (WooCommerce text is used when the category has one). */
function categoryDescription(c: ShopCat) {
  if (c.description.length >= 70) return c.description.slice(0, 158);
  const what = c.label.toLowerCase();
  return `Shop women's ${what} at ${SITE.name}. Browse the latest styles, check sale prices and filter by price or stock to find your fit.`;
}

export async function generateMetadata({ searchParams }: PageProps<"/shop">): Promise<Metadata> {
  const sp = (await searchParams) as SP;
  const cat = await resolveShopCategory(one(sp.category));
  const q = one(sp.q).slice(0, 60);
  if (q) {
    return {
      title: `Search results for “${q}”`,
      description: `Women's fashion at ${SITE.name} matching “${q}”.`,
      // Search result pages are useful for shoppers, not for search engines.
      robots: { index: false, follow: true },
      alternates: { canonical: "/shop" },
    };
  }
  if (cat) {
    const title = `Women's ${cat.label}`.replace("Women's Best Sellers", "Best Sellers in Women's Fashion").replace("Women's New Arrivals", "New Arrivals in Women's Fashion");
    return {
      title,
      description: categoryDescription(cat),
      alternates: { canonical: `/shop?category=${cat.slug}` },
      openGraph: { title: `${title} | ${SITE.name}`, url: `/shop?category=${cat.slug}` },
    };
  }
  return {
    title: "Shop Women's Fashion",
    description: `Shop women's dresses, lingerie, sleepwear, blouses and sweaters at ${SITE.name}. Filter by category, price, sale items and stock.`,
    alternates: { canonical: "/shop" },
    openGraph: { title: `Shop Women's Fashion | ${SITE.name}`, url: "/shop" },
  };
}

const SORTS: Record<string, Pick<ProductQuery, "orderby" | "order">> = {
  featured: { orderby: "menu_order", order: "asc" },
  newest: { orderby: "date", order: "desc" },
  "price-asc": { orderby: "price", order: "asc" },
  "price-desc": { orderby: "price", order: "desc" },
  popular: { orderby: "popularity", order: "desc" },
  name: { orderby: "title", order: "asc" },
};

export default function ShopPage({ searchParams }: PageProps<"/shop">) {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <ShopContent searchParams={searchParams as Promise<SP>} />
    </Suspense>
  );
}

async function ShopContent({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const category = one(sp.category);
  const q = one(sp.q).slice(0, 100);
  const sort = SORTS[one(sp.sort)] ? one(sp.sort) : "featured";
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const min = one(sp.min) ? Number(one(sp.min)) : undefined;
  const max = one(sp.max) ? Number(one(sp.max)) : undefined;
  const onSale = one(sp.sale) === "1";
  const inStock = one(sp.stock) === "1";

  // Search: product ids matching title, descriptions or any product/variation SKU (best first).
  const found = q.trim() ? await searchProductIds(q) : null;

  const [cats, cat] = await Promise.all([getAllCategories(), resolveShopCategory(category)]);
  // Men's, kids' or unknown categories are not part of this women's fashion store.
  if (category && !cat) notFound();
  const priceMin = Number.isFinite(min) ? min : undefined;
  const priceMax = Number.isFinite(max) ? max : undefined;

  let result: Awaited<ReturnType<typeof getProducts>>;
  if (found) {
    // Search: filter/sort the matching ids, then load just this page's products.
    const ids = await filterSearchIds(found.ids, {
      categoryIds: cat?.ids,
      minPrice: priceMin,
      maxPrice: priceMax,
      onSale,
      inStock,
      sort: sort as SearchFilters["sort"],
    });
    const slice = ids.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const list = await getProducts({ include: slice, orderby: "include", order: "asc", perPage: PAGE_SIZE });
    result = { products: list.products, total: ids.length, totalPages: Math.ceil(ids.length / PAGE_SIZE) };
  } else {
    result = await getProducts({
      category: category || undefined,
      page,
      ...SORTS[sort],
      minPrice: priceMin,
      maxPrice: priceMax,
      onSale,
      inStock,
    });
  }

  const filterCats = FILTER_CATEGORY_SLUGS.map((slug) => cats.find((c) => c.slug === slug))
    .filter((c): c is WCCategory => !!c && c.count > 0)
    .map((c) => ({ slug: c.slug, name: categoryLabel(c.slug, decodeEntities(c.name)), count: c.count }));

  const title = q ? `Results for “${q}”` : cat ? (cat.slug in WOMEN_COLLECTIONS ? cat.label : `Women's ${cat.label}`) : "Shop Women's Fashion";

  // Breadcrumb: Home › Shop › category (› Search results)
  const crumbs: Crumb[] = [
    { label: "Shop", href: "/shop" },
    ...(cat ? [{ label: cat.label, href: `/shop?category=${cat.slug}` }] : []),
    ...(q ? [{ label: "Search results" }] : []),
  ];
  if (!cat && !q) crumbs.splice(0, 1, { label: "Shop" });
  const from = result.total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(page * PAGE_SIZE, result.total);

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (k !== "page" && one(v)) params.set(k, one(v));
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/shop${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHero
        title={title}
        crumbs={crumbs}
        description={cat?.description || undefined}
      />

      <div className="mx-auto max-w-[1440px] px-5 pb-24 pt-10 md:px-8 md:pt-14">

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8">
        <ShopFilters categories={filterCats} />

        <section aria-label="Products">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <p className="text-[15px] text-muted">
              {result.total ? `Showing ${from}–${to} of ${result.total} products` : "No products found"}
            </p>
            <SortSelect value={sort} />
          </div>

          {result.products.length ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 xl:grid-cols-3">
              {result.products.map((p, i) => (
                <ProductCard key={p.id} product={p} priority={i < 3} />
              ))}
            </div>
          ) : (
            <div className="glass-card rounded-3xl px-6 py-20 text-center">
              <p className="font-display text-2xl">Nothing matches those filters</p>
              <p className="mt-2 text-muted">Try removing a filter or searching for something else.</p>
              <Link href="/shop" className="mt-6 inline-block rounded-full bg-heading px-7 py-3 text-sm font-semibold text-white">
                Clear all filters
              </Link>
            </div>
          )}

          {result.totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-16 flex items-center justify-center gap-2">
              <PageLink href={pageHref(page - 1)} disabled={page <= 1} label="Previous page">‹</PageLink>
              {pagesToShow(page, result.totalPages).map((p, i) =>
                p === "…" ? (
                  <span key={`e${i}`} className="px-2 text-muted">…</span>
                ) : (
                  <PageLink key={p} href={pageHref(p)} active={p === page} label={`Page ${p}`}>
                    {p}
                  </PageLink>
                ),
              )}
              <PageLink href={pageHref(page + 1)} disabled={page >= result.totalPages} label="Next page">›</PageLink>
            </nav>
          )}
        </section>
      </div>
      </div>
    </>
  );
}

function pagesToShow(cur: number, total: number): (number | "…")[] {
  const set = new Set([1, total, cur - 1, cur, cur + 1].filter((n) => n >= 1 && n <= total));
  const arr = [...set].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  arr.forEach((n, i) => {
    if (i && n - arr[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
}

function PageLink({
  href,
  children,
  active,
  disabled,
  label,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  label: string;
}) {
  const cls = `grid size-11 place-items-center rounded-full text-[15px] transition ${
    active ? "bg-heading text-white shadow-[0_10px_22px_-10px_rgba(34,32,29,.6)]" : disabled ? "bg-card/50 text-muted" : "glass-chip hover:border-primary hover:text-primary-hover"
  }`;
  if (disabled) return <span className={cls} aria-hidden>{children}</span>;
  return (
    <Link href={href} className={cls} aria-label={label} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}

function ShopSkeleton() {
  return (
    <>
    <PageHeroSkeleton />
    <div className="mx-auto max-w-[1440px] animate-pulse px-5 pb-24 pt-10 md:px-8 md:pt-14">
      <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
        <div className="hidden h-96 rounded-3xl bg-white/50 lg:block" />
        <div className="grid grid-cols-2 gap-6 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <div className="aspect-[3/4] rounded-2xl bg-white/50" />
              <div className="mt-4 h-4 w-3/4 rounded bg-card" />
              <div className="mt-2 h-4 w-1/3 rounded bg-card" />
            </div>
          ))}
        </div>
      </div>
    </div>
    </>
  );
}

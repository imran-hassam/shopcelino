import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAllCategories, getCategory, getProducts, type ProductQuery } from "@/lib/woo";
import { HIDDEN_CATEGORY_SLUGS, NON_FILTER_CATEGORY_SLUGS, PAGE_SIZE } from "@/lib/config";
import { decodeEntities, stripHtml } from "@/lib/format";
import { ProductCard } from "@/components/ProductCard";
import { ShopFilters } from "@/components/ShopFilters";
import { PageHero, PageHeroSkeleton, type Crumb } from "@/components/PageHero";
import { filterSearchIds, searchProductIds, type SearchFilters } from "@/lib/search";
import { SortSelect } from "@/components/SortSelect";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export async function generateMetadata({ searchParams }: PageProps<"/shop">): Promise<Metadata> {
  const sp = (await searchParams) as SP;
  const cat = one(sp.category) ? await getCategory(one(sp.category)) : null;
  const q = one(sp.q);
  const title = cat ? decodeEntities(cat.name) : q ? `Search: ${q}` : "Shop All Products";
  return {
    title,
    description: cat?.description ? stripHtml(cat.description).slice(0, 160) : undefined,
    alternates: { canonical: cat ? `/shop?category=${cat.slug}` : "/shop" },
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

  const [cats, cat] = await Promise.all([getAllCategories(), category ? getCategory(category) : Promise.resolve(null)]);
  const priceMin = Number.isFinite(min) ? min : undefined;
  const priceMax = Number.isFinite(max) ? max : undefined;

  let result: Awaited<ReturnType<typeof getProducts>>;
  if (found) {
    // Search: filter/sort the matching ids, then load just this page's products.
    const ids = category && !cat ? [] : await filterSearchIds(found.ids, {
      categoryId: cat?.id,
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

  const filterCats = cats
    .filter((c) => c.count > 0 && !HIDDEN_CATEGORY_SLUGS.includes(c.slug) && !NON_FILTER_CATEGORY_SLUGS.includes(c.slug))
    .map((c) => ({ slug: c.slug, name: decodeEntities(c.name), count: c.count }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const title = q ? `Results for “${q}”` : cat ? decodeEntities(cat.name) : "Shop All Products";

  // Breadcrumb: Home › Shop › parent categories › current category (› Search results)
  const chain: typeof cats = [];
  for (let c = cat; c; c = c.parent ? cats.find((x) => x.id === c!.parent) ?? null : null) {
    chain.unshift(c);
    if (chain.length > 5) break;
  }
  const crumbs: Crumb[] = [
    { label: "Shop", href: "/shop" },
    ...chain.map((c) => ({ label: decodeEntities(c.name), href: `/shop?category=${c.slug}` })),
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
        description={cat?.description ? stripHtml(cat.description) : undefined}
      />

      <div className="mx-auto max-w-[1440px] px-5 pb-24 pt-10 md:px-8 md:pt-14">

      <div className="grid gap-10 lg:grid-cols-[300px_1fr] lg:gap-8">
        <ShopFilters categories={filterCats} />

        <section aria-label="Products">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <p className="text-[15px] text-muted">
              {result.total ? `Showing ${from}–${to} of ${result.total} products` : "No products found"}
            </p>
            <SortSelect value={sort} />
          </div>

          {result.products.length ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 xl:grid-cols-3">
              {result.products.map((p, i) => (
                <ProductCard key={p.id} product={p} priority={i < 3} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-card px-6 py-20 text-center">
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
    active ? "bg-heading text-white" : disabled ? "bg-card text-muted" : "hover:bg-card"
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
        <div className="hidden h-96 rounded-xl bg-card lg:block" />
        <div className="grid grid-cols-2 gap-6 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <div className="aspect-[3/4] rounded-xl bg-card" />
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

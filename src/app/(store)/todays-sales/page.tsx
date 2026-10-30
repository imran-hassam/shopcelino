import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getProducts } from "@/lib/woo";
import { PAGE_SIZE } from "@/lib/config";
import { ProductCard } from "@/components/ProductCard";
import { PageHero, PageHeroSkeleton } from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Today's Sales on Women's Fashion",
  description: "See every women's style on sale at Shop Celino right now, newest first: dresses, lingerie, sleepwear and more, with the original price shown.",
  alternates: { canonical: "/todays-sales" },
  openGraph: { title: "Today's Sales on Women's Fashion | Shop Celino", url: "/todays-sales" },
};

export default function TodaysSalesPage({ searchParams }: PageProps<"/todays-sales">) {
  return (
    <Suspense fallback={<SalesSkeleton />}>
      <SalesContent searchParams={searchParams as Promise<Record<string, string | string[] | undefined>>} />
    </Suspense>
  );
}

async function SalesContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const page = Math.max(1, Number(raw) || 1);
  // All products with an active WooCommerce sale price, newest first.
  const result = await getProducts({ onSale: true, orderby: "date", order: "desc", page, perPage: PAGE_SIZE });
  const from = result.total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(page * PAGE_SIZE, result.total);
  const href = (p: number) => (p > 1 ? `/todays-sales?page=${p}` : "/todays-sales");

  return (
    <>
      <PageHero title="Today's Sales" crumbs={[{ label: "Shop", href: "/shop" }, { label: "Today's Sales" }]} />
      <div className="mx-auto max-w-[1440px] px-5 pb-24 pt-10 md:px-8 md:pt-14">
        <p className="mb-8 text-[15px] text-muted">
          {result.total ? `Showing ${from}–${to} of ${result.total} products on sale` : "No products are on sale right now."}
        </p>
        {result.products.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
            {result.products.map((p, i) => (
              <ProductCard key={p.id} product={p} priority={i < 4} />
            ))}
          </div>
        )}
        {result.totalPages > 1 && (
          <nav aria-label="Pagination" className="mt-16 flex items-center justify-center gap-2">
            <PageLink href={href(page - 1)} disabled={page <= 1} label="Previous page">‹</PageLink>
            {pagesToShow(page, result.totalPages).map((p, i) =>
              p === "…" ? (
                <span key={`e${i}`} className="px-2 text-muted">…</span>
              ) : (
                <PageLink key={p} href={href(p)} active={p === page} label={`Page ${p}`}>{p}</PageLink>
              ),
            )}
            <PageLink href={href(page + 1)} disabled={page >= result.totalPages} label="Next page">›</PageLink>
          </nav>
        )}
      </div>
    </>
  );
}

function pagesToShow(cur: number, total: number): (number | "…")[] {
  const arr = [...new Set([1, total, cur - 1, cur, cur + 1].filter((n) => n >= 1 && n <= total))].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  arr.forEach((n, i) => {
    if (i && n - arr[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
}

function PageLink({ href, children, active, disabled, label }: { href: string; children: React.ReactNode; active?: boolean; disabled?: boolean; label: string }) {
  const cls = `grid size-11 place-items-center rounded-full text-[15px] transition ${active ? "bg-heading text-white shadow-[0_10px_22px_-10px_rgba(34,32,29,.6)]" : disabled ? "bg-card/50 text-muted" : "glass-chip hover:border-primary hover:text-primary-hover"}`;
  if (disabled) return <span className={cls} aria-hidden>{children}</span>;
  return (
    <Link href={href} className={cls} aria-label={label} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}

function SalesSkeleton() {
  return (
    <>
      <PageHeroSkeleton />
      <div className="mx-auto grid max-w-[1440px] animate-pulse grid-cols-2 gap-6 px-5 pb-24 pt-10 md:grid-cols-3 md:px-8 md:pt-14 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i}>
            <div className="aspect-[3/4] rounded-2xl bg-white/50" />
            <div className="mt-4 h-4 w-3/4 rounded bg-card" />
          </div>
        ))}
      </div>
    </>
  );
}

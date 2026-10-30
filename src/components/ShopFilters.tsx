"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Minus, Plus, SlidersHorizontal, X } from "lucide-react";

type Cat = { slug: string; name: string; count: number };

const PRICE_RANGES = [
  { label: "Under $25", min: "", max: "25" },
  { label: "$25 – $50", min: "25", max: "50" },
  { label: "$50 – $100", min: "50", max: "100" },
  { label: "$100 & above", min: "100", max: "" },
];

export function ShopFilters({ categories }: { categories: Cat[] }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const current = sp.get("category") ?? "";
  const min = sp.get("min") ?? "";
  const max = sp.get("max") ?? "";

  function hrefWith(changes: Record<string, string | null>) {
    const params = new URLSearchParams(sp.toString());
    params.delete("page");
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    }
    const s = params.toString();
    return `${pathname}${s ? `?${s}` : ""}`;
  }

  const go = (changes: Record<string, string | null>) => router.push(hrefWith(changes), { scroll: false });

  const activeCount = [current, min || max, sp.get("sale"), sp.get("stock"), sp.get("q")].filter(Boolean).length;
  const visibleCats = showAll ? categories : categories.slice(0, 12);

  const panel = (
    <div>
      <div className="flex items-center justify-between pb-4">
        <h2 className="font-sans text-xl font-semibold">Filter by</h2>
        {activeCount > 0 && (
          <Link href={pathname} className="text-sm underline underline-offset-4 hover:text-primary-hover">
            Clear all
          </Link>
        )}
      </div>

      {sp.get("q") && (
        <div className="glass-chip mb-4 flex items-center justify-between rounded-full px-4 py-2 text-sm">
          <span>Search: “{sp.get("q")}”</span>
          <button onClick={() => go({ q: null })} aria-label="Clear search"><X className="size-4" /></button>
        </div>
      )}

      <Section title="Categories" defaultOpen>
        <ul className="space-y-2.5">
          <li>
            <FilterOption checked={!current} onClick={() => go({ category: null })} label="All products" />
          </li>
          {visibleCats.map((c) => (
            <li key={c.slug}>
              <FilterOption
                checked={current === c.slug}
                onClick={() => go({ category: current === c.slug ? null : c.slug })}
                label={c.name}
                count={c.count}
              />
            </li>
          ))}
        </ul>
        {categories.length > 12 && (
          <button onClick={() => setShowAll((s) => !s)} className="mt-3 text-sm underline underline-offset-4">
            {showAll ? "Show fewer" : `Show all ${categories.length}`}
          </button>
        )}
      </Section>

      <Section title="Price" defaultOpen={Boolean(min || max)}>
        <ul className="space-y-2.5">
          {PRICE_RANGES.map((r) => {
            const on = min === r.min && max === r.max;
            return (
              <li key={r.label}>
                <FilterOption checked={on} onClick={() => go(on ? { min: null, max: null } : { min: r.min, max: r.max })} label={r.label} />
              </li>
            );
          })}
        </ul>
        <form
          className="mt-4 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            go({ min: String(f.get("min") ?? ""), max: String(f.get("max") ?? "") });
          }}
        >
          <input name="min" defaultValue={min} inputMode="numeric" placeholder="Min $" aria-label="Minimum price" className="glass-field w-full rounded-xl px-3 py-2 text-sm outline-none" />
          <span className="text-muted">–</span>
          <input name="max" defaultValue={max} inputMode="numeric" placeholder="Max $" aria-label="Maximum price" className="glass-field w-full rounded-xl px-3 py-2 text-sm outline-none" />
          <button className="rounded-xl bg-heading px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-primary hover:text-heading">Go</button>
        </form>
      </Section>

      <Section title="Availability" defaultOpen={Boolean(sp.get("sale") || sp.get("stock"))}>
        <ul className="space-y-2.5">
          <li>
            <FilterOption checked={sp.get("sale") === "1"} onClick={() => go({ sale: sp.get("sale") === "1" ? null : "1" })} label="On sale" />
          </li>
          <li>
            <FilterOption checked={sp.get("stock") === "1"} onClick={() => go({ stock: sp.get("stock") === "1" ? null : "1" })} label="In stock only" />
          </li>
        </ul>
      </Section>
    </div>
  );

  return (
    <>
      <div className="lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="glass-chip flex w-full items-center justify-center gap-2 rounded-full py-3 font-semibold"
        >
          <SlidersHorizontal className="size-4" /> Filters {activeCount > 0 && `(${activeCount})`}
        </button>
      </div>
      <aside className="glass-card hidden self-start rounded-3xl p-6 lg:block">{panel}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-[55] lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="absolute inset-0 bg-heading/35 backdrop-blur-[3px]" onClick={() => setMobileOpen(false)} />
          <div className="glass absolute inset-y-0 right-0 w-[88vw] max-w-sm overflow-y-auto rounded-l-3xl border-r-0 p-6 !shadow-2xl">
            <button onClick={() => setMobileOpen(false)} aria-label="Close filters" className="absolute right-4 top-5">
              <X className="size-6" strokeWidth={1.5} />
            </button>
            {panel}
            <button onClick={() => setMobileOpen(false)} className="mt-8 w-full rounded-full bg-heading py-3 font-semibold text-white shadow-[0_10px_24px_-12px_rgba(34,32,29,.6)]">
              Show results
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="glass-divider border-t py-5">
      <button className="flex w-full items-center justify-between text-[17px] font-semibold" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {title}
        {open ? <Minus className="size-4" /> : <Plus className="size-4" />}
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  );
}

function FilterOption({ checked, onClick, label, count }: { checked: boolean; onClick: () => void; label: string; count?: number }) {
  return (
    <button onClick={onClick} className="group flex w-full items-center gap-3 text-left text-[15px]" role="checkbox" aria-checked={checked}>
      <span
        className={`grid size-[18px] shrink-0 place-items-center rounded border transition ${
          checked ? "border-heading bg-heading" : "border-heading/40 group-hover:border-heading"
        }`}
      >
        {checked && <svg viewBox="0 0 12 12" className="size-3 text-white" aria-hidden><path d="M2 6.5l2.5 2.5L10 3.5" fill="none" stroke="currentColor" strokeWidth="2" /></svg>}
      </span>
      <span className="flex-1 group-hover:text-primary-hover">{label}</span>
      {count !== undefined && <span className="text-sm text-muted">{count}</span>}
    </button>
  );
}

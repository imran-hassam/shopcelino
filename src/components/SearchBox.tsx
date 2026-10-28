"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { Suggestion } from "@/app/api/search/route";

// Shared by every search box on the page: same term → no second request.
const memo = new Map<string, Suggestion[]>();

/**
 * Header search with live suggestions (2+ characters, debounced).
 * Enter opens the full results page; arrow keys move through suggestions.
 */
export function SearchBox({ variant, onNavigate }: { variant: "desktop" | "drawer"; onNavigate?: () => void }) {
  const router = useRouter();
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const ctrl = useRef<AbortController>(undefined);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const term = q.trim();
  const showList = open && term.length >= 2;

  // Close when clicking anywhere else.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function lookup(value: string) {
    const t = value.trim().replace(/\s+/g, " ");
    clearTimeout(timer.current);
    ctrl.current?.abort();
    setActive(-1);
    if (t.length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }
    const key = t.toLowerCase();
    const hit = memo.get(key);
    if (hit) {
      setItems(hit);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      const c = new AbortController();
      ctrl.current = c;
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(t)}`, { signal: c.signal });
        const data = (await res.json()) as { items: Suggestion[] };
        if (res.ok) memo.set(key, data.items);
        setItems(data.items ?? []);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setItems([]);
      } finally {
        if (ctrl.current === c) setLoading(false);
      }
    }, 250);
  }

  function go(href: string) {
    setOpen(false);
    onNavigate?.();
    router.push(href);
  }

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    go(term ? `/shop?q=${encodeURIComponent(term)}` : "/shop");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!showList || !items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      go(items[active].href);
    }
  }

  const desktop = variant === "desktop";

  return (
    <div ref={wrapRef} className={desktop ? "relative hidden md:block" : "relative px-5 pt-5"}>
      <form onSubmit={submit} role="search">
        <label
          className={
            desktop
              ? "glass-field flex w-[260px] items-center rounded-full px-4 py-2 xl:w-[310px]"
              : "glass-field flex items-center rounded-full px-4 py-2.5"
          }
        >
          <span className="sr-only">Search products</span>
          <input
            data-search-input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
              lookup(e.target.value);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Find your style here..."
            autoComplete="off"
            enterKeyHint="search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showList}
            aria-controls={listId}
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            className={`w-full bg-transparent outline-none placeholder:text-muted ${desktop ? "text-[15px]" : ""}`}
          />
          <button type="submit" aria-label="Search" className="transition-colors hover:text-primary-hover">
            <Search className="size-5" strokeWidth={1.5} />
          </button>
        </label>
      </form>

      {showList && (
        <div
          className={`glass absolute z-[60] mt-3 overflow-hidden rounded-2xl !shadow-[0_30px_50px_-24px_rgba(34,32,29,.45)] ${
            desktop ? "right-0 top-full w-[min(92vw,440px)]" : "inset-x-5 top-full"
          }`}
        >
          <ul id={listId} role="listbox" aria-label="Search suggestions" className="max-h-[min(60vh,560px)] overflow-y-auto py-1">
            {items.map((s, i) => (
              <li key={s.id} id={`${listId}-${i}`} role="option" aria-selected={i === active} onMouseEnter={() => setActive(i)}>
                <Link
                  href={s.href}
                  tabIndex={-1}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                    e.preventDefault();
                    go(s.href);
                  }}
                  className={`mx-1.5 flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors ${i === active ? "bg-white/80 shadow-sm" : ""}`}
                >
                  <span className="h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-card ring-1 ring-white/80">
                    {s.image && <img src={s.image} alt="" loading="lazy" className="size-full object-cover object-top" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-[14px] leading-snug">{s.name}</span>
                    {s.sku && <span className="mt-0.5 block truncate text-[12px] text-muted">SKU: {s.sku}</span>}
                    <span className="mt-0.5 block text-[14px] font-semibold">{s.price}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {loading && !items.length && <p className="px-4 py-4 text-sm text-muted">Searching…</p>}
          {!loading && !items.length && <p className="px-4 py-4 text-sm text-muted">No products found for “{term}”.</p>}
          {items.length > 0 && (
            <button type="button" onClick={() => submit()} className="block w-full border-t border-line px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-white/70 hover:text-primary-hover">
              View all results for “{term}”
            </button>
          )}
        </div>
      )}
    </div>
  );
}

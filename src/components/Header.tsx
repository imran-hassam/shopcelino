"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Heart, Menu, ShoppingBag, User, X } from "lucide-react";
import { MENU_CATEGORIES } from "@/lib/config";
import { useStore } from "./StoreProvider";
import { Logo } from "./Logo";
import { NavLink } from "./NavLink";
import { SearchBox } from "./SearchBox";
import { MegaMenu } from "./MegaMenu";
import type { MegaMenuData, SalesMenuData } from "@/lib/mega";
import { SalesMenu, SalesMenuCompact } from "./SalesMenu";

const NAV: { href: string; label: string; dropdown?: boolean; sales?: boolean }[] = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop", dropdown: true },
  { href: "/todays-sales", label: "Today's Sales", sales: true },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact Us" },
];

export function Header({ logoUrl, accountUrl }: { logoUrl: string; accountUrl: string }) {
  const { cartCount, wishlist } = useStore();
  const [open, setOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // Mega menu content mounts on first hover/focus (keeps its images off the initial page load).
  const [mega, setMega] = useState<MegaMenuData | null>(null);
  const megaLoading = useRef(false);
  function loadMega() {
    if (mega || megaLoading.current) return;
    megaLoading.current = true;
    fetch("/api/mega")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: MegaMenuData | null) => d && setMega(d))
      .catch(() => undefined)
      .finally(() => (megaLoading.current = false));
  }
  // Hide right after a click inside it, until the pointer leaves the Shop item.
  const [megaHidden, setMegaHidden] = useState(false);

  // "Today's Sales" mega menu: opens on hover or click (touch), closes on Escape / outside click.
  const [sales, setSales] = useState<SalesMenuData | null>(null);
  const salesLoading = useRef(false);
  const [salesHover, setSalesHover] = useState(false);
  const [salesPinned, setSalesPinned] = useState(false);
  const [salesDrawer, setSalesDrawer] = useState(false);
  const salesRef = useRef<HTMLDivElement>(null);
  const salesBtn = useRef<HTMLButtonElement>(null);
  const salesShown = salesHover || salesPinned;
  function loadSales() {
    if (sales || salesLoading.current) return;
    salesLoading.current = true;
    fetch("/api/sales-menu")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: SalesMenuData | null) => d && setSales(d))
      .catch(() => undefined)
      .finally(() => (salesLoading.current = false));
  }
  function closeSales() {
    setSalesHover(false);
    setSalesPinned(false);
  }
  useEffect(() => {
    if (!salesShown) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeSales();
        salesBtn.current?.focus();
      }
    };
    const onDown = (e: MouseEvent) => {
      if (salesRef.current && !salesRef.current.contains(e.target as Node)) closeSales();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [salesShown]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);


  return (
    <header
      className={`sticky top-0 z-50 border-b border-line bg-white transition-shadow ${
        scrolled ? "shadow-[0_4px_20px_-12px_rgba(34,32,29,.35)]" : ""
      }`}
    >
      <div className="h-[3px] bg-heading" />
      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center gap-4 px-4 md:h-[88px] md:px-8">
        <button
          className="-ml-1 p-1 lg:hidden"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
        >
          <Menu className="size-6" strokeWidth={1.5} />
        </button>

        <Link href="/" aria-label="Shop Celino home" className="shrink-0">
          <Logo src={logoUrl} className="h-9 md:h-11" />
        </Link>

        <nav className="ml-10 hidden items-center gap-10 self-stretch lg:flex" aria-label="Main">
          {NAV.map((item) =>
            item.dropdown ? (
              <div
                key={item.href}
                className="group flex self-stretch"
                onMouseEnter={() => {
                  loadMega();
                  setMegaHidden(false);
                }}
                onFocus={loadMega}
                onMouseLeave={() => setMegaHidden(false)}
              >
                <NavLink
                  href={item.href}
                  className="flex items-center gap-1.5 text-[17px] transition-colors hover:text-primary-hover"
                  activeClassName="text-primary-hover"
                >
                  {item.label}
                  <ChevronDown className="size-4 transition-transform group-hover:rotate-180" strokeWidth={1.5} />
                </NavLink>
                {/* Full-width mega menu (positioned against the sticky header) */}
                <div
                  className={`invisible absolute inset-x-0 top-full translate-y-1 border-t border-line bg-white opacity-0 shadow-[0_24px_40px_-20px_rgba(34,32,29,.35)] transition-all duration-200 ${
                    megaHidden
                      ? ""
                      : "group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100"
                  }`}
                >
                  {mega ? (
                    <MegaMenu
                      data={mega}
                      onNavigate={() => {
                        setMegaHidden(true);
                        (document.activeElement as HTMLElement | null)?.blur();
                      }}
                    />
                  ) : (
                    <div className="mx-auto flex max-w-[1440px] flex-wrap gap-x-8 gap-y-3 px-8 py-6">
                      {MENU_CATEGORIES.map((c) => (
                        <Link key={c.slug} href={`/shop?category=${c.slug}`} className="text-[15px] hover:text-primary-hover">
                          {c.label}
                        </Link>
                      ))}
                      <Link href="/shop" className="text-[15px] font-semibold hover:text-primary-hover">Shop All</Link>
                    </div>
                  )}
                </div>
              </div>
            ) : item.sales ? (
              <div
                key={item.href}
                ref={salesRef}
                className="flex self-stretch"
                onMouseEnter={() => {
                  loadSales();
                  setSalesHover(true);
                }}
                onMouseLeave={() => setSalesHover(false)}
              >
                <button
                  ref={salesBtn}
                  type="button"
                  aria-expanded={salesShown}
                  aria-controls="sales-menu"
                  onClick={() => {
                    loadSales();
                    setSalesPinned((p) => !p);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      loadSales();
                      setSalesPinned(true);
                    }
                  }}
                  className={`flex items-center gap-1.5 text-[17px] transition-colors hover:text-primary-hover ${salesShown ? "text-primary-hover" : ""}`}
                >
                  {item.label}
                  <ChevronDown className={`size-4 transition-transform ${salesShown ? "rotate-180" : ""}`} strokeWidth={1.5} />
                </button>
                <div
                  id="sales-menu"
                  className={`absolute inset-x-0 top-full border-t border-line shadow-[0_24px_40px_-20px_rgba(34,32,29,.35)] transition-all duration-200 ${
                    salesShown ? "visible translate-y-0 opacity-100" : "invisible translate-y-1 opacity-0"
                  }`}
                >
                  <SalesMenu
                    data={sales}
                    onNavigate={() => {
                      closeSales();
                      (document.activeElement as HTMLElement | null)?.blur();
                    }}
                  />
                </div>
              </div>
            ) : (
              <NavLink
                key={item.href}
                href={item.href}
                className="text-[17px] transition-colors hover:text-primary-hover"
                activeClassName="text-primary-hover"
              >
                {item.label}
              </NavLink>
            ),
          )}
        </nav>

        <div className="ml-auto flex items-center gap-3 md:gap-5">
          <SearchBox variant="desktop" />
          <Link href="/wishlist" aria-label={`Wishlist (${wishlist.length})`} className="relative p-1">
            <Heart className="size-6" strokeWidth={1.5} />
            {wishlist.length > 0 && <Badge n={wishlist.length} />}
          </Link>
          <Link href="/cart" aria-label={`Cart (${cartCount} items)`} className="relative p-1">
            <ShoppingBag className="size-6" strokeWidth={1.5} />
            {cartCount > 0 && <Badge n={cartCount} />}
          </Link>
          <a href={accountUrl} aria-label="My account" className="hidden p-1 sm:block">
            <User className="size-6" strokeWidth={1.5} />
          </a>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-50 bg-heading/40 transition-opacity lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-sm flex-col bg-background shadow-2xl transition-transform duration-300 lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Menu"
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <Logo src={logoUrl} className="h-9" />
          <button aria-label="Close menu" onClick={() => setOpen(false)} className="p-1">
            <X className="size-6" strokeWidth={1.5} />
          </button>
        </div>
        <SearchBox variant="drawer" onNavigate={() => setOpen(false)} />
        <nav
          className="flex-1 overflow-y-auto px-5 py-4 text-lg"
          aria-label="Mobile"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a")) setOpen(false);
          }}
        >
          <Link href="/" className="block border-b border-line py-3.5">Home</Link>
          <button
            className="flex w-full items-center justify-between border-b border-line py-3.5"
            onClick={() => setShopOpen((s) => !s)}
            aria-expanded={shopOpen}
          >
            Shop <ChevronDown className={`size-5 transition-transform ${shopOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
          </button>
          {shopOpen && (
            <div className="border-b border-line py-2 pl-3 text-base">
              <Link href="/shop" className="block py-2 font-semibold">Shop All</Link>
              {MENU_CATEGORIES.map((c) => (
                <Link key={c.slug} href={`/shop?category=${c.slug}`} className="block py-2 text-foreground/85">
                  {c.label}
                </Link>
              ))}
            </div>
          )}
          <button
            className="flex w-full items-center justify-between border-b border-line py-3.5"
            onClick={() => {
              loadSales();
              setSalesDrawer((s) => !s);
            }}
            aria-expanded={salesDrawer}
          >
            Today&apos;s Sales <ChevronDown className={`size-5 transition-transform ${salesDrawer ? "rotate-180" : ""}`} strokeWidth={1.5} />
          </button>
          {salesDrawer && (
            <div className="border-b border-line">
              <SalesMenuCompact data={sales} onNavigate={() => setOpen(false)} />
            </div>
          )}
          <Link href="/about" className="block border-b border-line py-3.5">About Us</Link>
          <Link href="/contact" className="block border-b border-line py-3.5">Contact Us</Link>
          <Link href="/wishlist" className="block border-b border-line py-3.5">Wishlist</Link>
          <a href={accountUrl} className="block border-b border-line py-3.5">My Account</a>
        </nav>
      </aside>
    </header>
  );
}

function Badge({ n }: { n: number }) {
  return (
    <span className="absolute -right-1.5 -top-1.5 grid min-w-[18px] place-items-center rounded-full border-2 border-white bg-primary px-1 text-[10px] font-bold leading-[14px] text-heading">
      {n > 99 ? "99+" : n}
    </span>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { MENU_CATEGORIES } from "@/lib/config";
import { useStore } from "./StoreProvider";
import { Logo } from "./Logo";
import { NavLink } from "./NavLink";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop", dropdown: true },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact Us" },
];

export function Header({ logoUrl, accountUrl }: { logoUrl: string; accountUrl: string }) {
  const router = useRouter();
  const { cartCount, wishlist } = useStore();
  const [open, setOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [q, setQ] = useState("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/shop?q=${encodeURIComponent(term)}` : "/shop");
    setOpen(false);
  }

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

        <nav className="ml-10 hidden items-center gap-10 lg:flex" aria-label="Main">
          {NAV.map((item) =>
            item.dropdown ? (
              <div key={item.href} className="group relative">
                <NavLink
                  href={item.href}
                  className="flex items-center gap-1.5 py-6 text-[17px] transition-colors hover:text-primary-hover"
                  activeClassName="text-primary-hover"
                >
                  {item.label}
                  <ChevronDown className="size-4 transition-transform group-hover:rotate-180" strokeWidth={1.5} />
                </NavLink>
                <div className="invisible absolute left-1/2 top-full w-60 -translate-x-1/2 translate-y-2 rounded-xl border border-line bg-white p-2 opacity-0 shadow-xl transition-all duration-200 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                  {MENU_CATEGORIES.map((c) => (
                    <Link
                      key={c.slug}
                      href={`/shop?category=${c.slug}`}
                      className="block rounded-lg px-4 py-2.5 text-[15px] hover:bg-card hover:text-primary-hover"
                    >
                      {c.label}
                    </Link>
                  ))}
                  <Link href="/shop" className="mt-1 block rounded-lg border-t border-line px-4 py-2.5 text-[15px] font-semibold hover:bg-card">
                    Shop All
                  </Link>
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
          <form onSubmit={submit} role="search" className="hidden md:block">
            <label className="flex w-[260px] items-center rounded-full border border-heading/70 px-4 py-2 transition-colors focus-within:border-primary-hover xl:w-[310px]">
              <span className="sr-only">Search products</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Find your style here..."
                className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted"
              />
              <button type="submit" aria-label="Search">
                <Search className="size-5" strokeWidth={1.5} />
              </button>
            </label>
          </form>
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
        <form onSubmit={submit} role="search" className="px-5 pt-5">
          <label className="flex items-center rounded-full border border-heading/70 bg-white px-4 py-2.5">
            <span className="sr-only">Search products</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Find your style here..."
              className="w-full bg-transparent outline-none placeholder:text-muted"
            />
            <button type="submit" aria-label="Search">
              <Search className="size-5" strokeWidth={1.5} />
            </button>
          </label>
        </form>
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

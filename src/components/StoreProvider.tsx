"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { WCCart } from "@/lib/types";

type WishItem = { id: number; slug: string; name: string; image?: string; price?: string };

type Notice = { id: number; text: string; kind: "ok" | "error"; link?: { href: string; label: string } };

type StoreCtx = {
  cart: WCCart | null;
  cartLoading: boolean;
  cartCount: number;
  refreshCart: () => Promise<void>;
  cartAction: (action: string, body?: unknown) => Promise<{ ok: boolean; data: unknown }>;
  addToCart: (input: { id: number; quantity: number; variation?: { attribute: string; value: string }[] }, name?: string) => Promise<boolean>;
  wishlist: WishItem[];
  toggleWish: (item: WishItem) => void;
  isWished: (id: number) => boolean;
  notify: (text: string, kind?: "ok" | "error", link?: Notice["link"]) => void;
};

const Ctx = createContext<StoreCtx | null>(null);

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore must be used inside StoreProvider");
  return c;
}

const WISH_KEY = "sc_wishlist";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<WCCart | null>(null);
  const [cartLoading, setCartLoading] = useState(true);
  const [wishlist, setWishlist] = useState<WishItem[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const noticeId = useRef(0);

  const notify = useCallback<StoreCtx["notify"]>((text, kind = "ok", link) => {
    const id = ++noticeId.current;
    setNotices((n) => [...n, { id, text, kind, link }]);
    setTimeout(() => setNotices((n) => n.filter((x) => x.id !== id)), 4500);
  }, []);

  const refreshCart = useCallback(async () => {
    try {
      const res = await fetch("/api/cart", { cache: "no-store" });
      if (res.ok) setCart(await res.json());
    } catch {
      /* ignore — header just shows 0 */
    } finally {
      setCartLoading(false);
    }
  }, []);

  const cartAction = useCallback<StoreCtx["cartAction"]>(async (action, body) => {
    const res = await fetch(`/api/cart/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {}
    // Cart endpoints return the full cart; checkout returns an order.
    if (res.ok && action !== "checkout" && data && typeof data === "object" && "items" in data) {
      setCart(data as WCCart);
    }
    return { ok: res.ok, data };
  }, []);

  const addToCart = useCallback<StoreCtx["addToCart"]>(
    async (input, name) => {
      const { ok, data } = await cartAction("add-item", input);
      if (ok) {
        notify(`${name ?? "Item"} added to your cart`, "ok", { href: "/cart", label: "View cart" });
        return true;
      }
      const msg = (data as { message?: string })?.message;
      notify(msg ? stripTags(msg) : "Could not add this item. Please try again.", "error");
      return false;
    },
    [cartAction, notify],
  );

  // Load cart + saved wishlist after hydration.
  useEffect(() => {
    Promise.resolve().then(() => {
      refreshCart();
      try {
        const raw = localStorage.getItem(WISH_KEY);
        if (raw) setWishlist(JSON.parse(raw));
      } catch {}
    });
  }, [refreshCart]);

  const toggleWish = useCallback((item: WishItem) => {
    setWishlist((list) => {
      const next = list.some((w) => w.id === item.id) ? list.filter((w) => w.id !== item.id) : [...list, item];
      try {
        localStorage.setItem(WISH_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const value = useMemo<StoreCtx>(
    () => ({
      cart,
      cartLoading,
      cartCount: cart?.items_count ?? 0,
      refreshCart,
      cartAction,
      addToCart,
      wishlist,
      toggleWish,
      isWished: (id) => wishlist.some((w) => w.id === id),
      notify,
    }),
    [cart, cartLoading, refreshCart, cartAction, addToCart, wishlist, toggleWish, notify],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-6 left-1/2 z-[60] flex w-[min(92vw,420px)] -translate-x-1/2 flex-col gap-2">
        {notices.map((n) => (
          <div
            key={n.id}
            className={`pointer-events-auto flex items-center justify-between gap-4 rounded-full px-5 py-3 text-sm shadow-lg ${
              n.kind === "error" ? "bg-[#7a2a1d] text-white" : "bg-heading text-footer-text"
            }`}
          >
            <span>{n.text}</span>
            {n.link && (
              <Link href={n.link.href} className="shrink-0 font-semibold text-secondary underline underline-offset-4">
                {n.link.label}
              </Link>
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

function stripTags(s: string) {
  return s.replace(/<[^>]*>/g, "").replace(/&quot;/g, '"').replace(/&#8220;|&#8221;/g, '"');
}

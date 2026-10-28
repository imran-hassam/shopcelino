"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { X } from "lucide-react";
import { useStore } from "@/components/StoreProvider";
import { PageHero } from "@/components/PageHero";

export default function WishlistPage() {
  const { wishlist, toggleWish } = useStore();
  return (
    <>
    <PageHero title="Wishlist" crumbs={[{ label: "Wishlist" }]} />
    <div className="mx-auto max-w-[1440px] px-5 pb-24 pt-10 md:px-8 md:pt-14">
      {wishlist.length === 0 ? (
        <div className="glass-card mx-auto max-w-2xl rounded-3xl px-6 py-16 text-center">
          <p className="text-muted">You haven&apos;t saved anything yet. Tap the heart on any product to keep it here.</p>
          <Link href="/shop" className="mt-8 inline-block rounded-full bg-heading px-8 py-3.5 font-semibold text-white transition hover:bg-primary hover:text-heading">Start shopping</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
          {wishlist.map((w) => (
            <div key={w.id} className="group glass-card glass-lift relative rounded-2xl p-2 sm:p-2.5">
              <Link href={w.slug ? `/product/${w.slug}` : "/shop"} className="block overflow-hidden rounded-xl bg-card">
                {w.image && <img src={w.image} alt={w.name} className="aspect-[3/4] w-full object-cover object-top transition duration-700 group-hover:scale-105" />}
              </Link>
              <button onClick={() => toggleWish(w)} aria-label={`Remove ${w.name}`} className="absolute right-5 top-5 grid size-9 place-items-center rounded-full border border-white/70 bg-white/70 shadow-[0_6px_16px_-8px_rgba(34,32,29,.45)] backdrop-blur-md transition hover:bg-white hover:text-primary-hover">
                <X className="size-4" />
              </button>
              <Link href={w.slug ? `/product/${w.slug}` : "/shop"} className="mt-3.5 block px-1.5 transition-colors hover:text-primary-hover sm:px-2">{w.name}</Link>
              {w.sku && <p className="mt-1 truncate px-1.5 pb-1.5 text-[13px] text-muted sm:px-2">SKU: {w.sku}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  );
}

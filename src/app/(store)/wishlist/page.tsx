"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { X } from "lucide-react";
import { useStore } from "@/components/StoreProvider";

export default function WishlistPage() {
  const { wishlist, toggleWish } = useStore();
  return (
    <div className="mx-auto max-w-[1440px] px-5 pb-24 md:px-8">
      <h1 className="py-14 text-center text-[44px] md:py-20 md:text-[56px]">Wishlist</h1>
      {wishlist.length === 0 ? (
        <div className="text-center">
          <p className="text-muted">You haven&apos;t saved anything yet. Tap the heart on any product to keep it here.</p>
          <Link href="/shop" className="mt-8 inline-block rounded-full bg-heading px-8 py-3.5 font-semibold text-white">Start shopping</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {wishlist.map((w) => (
            <div key={w.id} className="group relative">
              <Link href={w.slug ? `/product/${w.slug}` : "/shop"} className="block overflow-hidden rounded-xl bg-card">
                {w.image && <img src={w.image} alt={w.name} className="aspect-[3/4] w-full object-cover object-top transition duration-700 group-hover:scale-105" />}
              </Link>
              <button onClick={() => toggleWish(w)} aria-label={`Remove ${w.name}`} className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white shadow">
                <X className="size-4" />
              </button>
              <Link href={w.slug ? `/product/${w.slug}` : "/shop"} className="mt-4 block hover:text-primary-hover">{w.name}</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

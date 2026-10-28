"use client";

import { Heart } from "lucide-react";
import { useStore } from "./StoreProvider";

type Item = { id: number; slug: string; name: string; image?: string; price?: string; sku?: string };

export function WishButton({ item, className = "" }: { item: Item; className?: string }) {
  const { isWished, toggleWish } = useStore();
  const on = isWished(item.id);
  return (
    <button
      type="button"
      aria-label={on ? `Remove ${item.name} from wishlist` : `Add ${item.name} to wishlist`}
      aria-pressed={on}
      onClick={() => toggleWish(item)}
      className={`grid size-10 place-items-center rounded-full border border-white/70 bg-white/70 shadow-[0_6px_16px_-8px_rgba(34,32,29,.45)] backdrop-blur-md transition hover:scale-110 hover:bg-white ${className}`}
    >
      <Heart className={`size-5 transition-colors ${on ? "fill-primary text-primary-hover" : ""}`} strokeWidth={1.5} />
    </button>
  );
}

import { Star } from "lucide-react";

export function Stars({ rating, count }: { rating: number; count: number }) {
  return (
    <span className="flex items-center gap-1 text-sm text-muted" aria-label={`Rated ${rating.toFixed(1)} out of 5 from ${count} reviews`}>
      <span className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`size-3.5 ${i <= Math.round(rating) ? "fill-primary text-primary" : "text-primary/40"}`}
            strokeWidth={1.5}
          />
        ))}
      </span>
      ({count})
    </span>
  );
}

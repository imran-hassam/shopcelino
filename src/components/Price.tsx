import type { WCPrices } from "@/lib/types";
import { formatMoney } from "@/lib/format";

export function Price({ prices, onSale, large = false }: { prices: WCPrices; onSale: boolean; large?: boolean }) {
  const range = prices.price_range;
  if (range && range.min_amount !== range.max_amount) {
    return (
      <p className={`font-semibold ${large ? "text-2xl" : "text-[17px]"}`}>
        {formatMoney(range.min_amount, prices)} – {formatMoney(range.max_amount, prices)}
      </p>
    );
  }
  const showStrike = onSale && prices.regular_price && prices.regular_price !== prices.price;
  return (
    <p className={`flex items-baseline gap-2 ${large ? "text-2xl" : "text-[17px]"}`}>
      <span className="font-semibold">{formatMoney(prices.price, prices)}</span>
      {showStrike && (
        <span className={`text-muted line-through ${large ? "text-lg" : "text-[15px]"}`}>
          <span className="sr-only">Was </span>
          {formatMoney(prices.regular_price, prices)}
        </span>
      )}
    </p>
  );
}

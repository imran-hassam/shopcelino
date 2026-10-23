"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import type { WCAttribute, WCPrices, WCVariationRef } from "@/lib/types";
import { Price } from "./Price";
import { useStore } from "./StoreProvider";
import { WishButton } from "./WishButton";

type Variation = {
  id: number;
  sku: string;
  prices: WCPrices;
  on_sale: boolean;
  is_in_stock: boolean;
  is_purchasable: boolean;
  image?: number;
};

type Props = {
  product: {
    id: number;
    slug: string;
    image?: string;
    name: string;
    sku: string;
    type: string;
    prices: WCPrices;
    on_sale: boolean;
    is_in_stock: boolean;
    is_purchasable: boolean;
    attributes: WCAttribute[];
    variationRefs: WCVariationRef[];
    max: number;
    soldIndividually: boolean;
  };
  variations: Variation[];
  summary: string;
};

const norm = (s: string) => s.trim().toLowerCase();

export function ProductBuyBox({ product, variations, summary }: Props) {
  const router = useRouter();
  const { addToCart } = useStore();
  const isVariable = product.type === "variable" && product.attributes.length > 0;
  const attrFor = (name: string) => product.attributes.find((a) => norm(a.name) === norm(name) || norm(a.taxonomy ?? "") === norm(name));
  const isAvailable = (id: number) => {
    const v = variations.find((x) => x.id === id);
    return Boolean(v && v.is_in_stock && v.is_purchasable);
  };
  // The option choices that select a given variation (null if it can't be expressed as button choices).
  function choiceFor(ref: WCVariationRef): Record<string, string> | null {
    const c: Record<string, string> = {};
    for (const attr of product.attributes) {
      const ra = ref.attributes.find((x) => attrFor(x.name) === attr);
      if (!ra || !ra.value) return null;
      const term = attr.terms.find((t) => norm(t.name) === norm(ra.value) || norm(t.slug) === norm(ra.value));
      if (!term) return null;
      c[attr.name] = term.name;
    }
    return c;
  }
  // Start with the first variation (store order) that is in stock and purchasable.
  const [chosen, setChosen] = useState<Record<string, string>>(() => {
    if (!isVariable) return {};
    for (const ref of product.variationRefs) {
      if (!isAvailable(ref.id)) continue;
      const c = choiceFor(ref);
      if (c) return c;
    }
    return {};
  });

  // Coming from a search result for a specific variation SKU (?variation=ID): select it if it can be bought.
  useEffect(() => {
    if (!isVariable) return;
    const id = Number(new URLSearchParams(window.location.search).get("variation"));
    const ref = id ? product.variationRefs.find((r) => r.id === id) : undefined;
    const c = ref && isAvailable(ref.id) ? choiceFor(ref) : null;
    if (c) Promise.resolve().then(() => setChosen(c));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState<"add" | "buy" | null>(null);
  const [error, setError] = useState("");

  // Which variation (if any) matches the chosen options. Empty value = "any".
  const matchRef = useMemo(() => {
    if (!isVariable) return null;
    if (product.attributes.some((a) => !chosen[a.name])) return null;
    return (
      product.variationRefs.find((ref) =>
        ref.attributes.every((ra) => {
          const attr = product.attributes.find((a) => norm(a.name) === norm(ra.name) || norm(a.taxonomy ?? "") === norm(ra.name));
          if (!attr) return true;
          if (!ra.value) return true;
          const pick = chosen[attr.name];
          const term = attr.terms.find((t) => t.name === pick);
          return norm(ra.value) === norm(pick) || (term && norm(ra.value) === norm(term.slug));
        }),
      ) ?? null
    );
  }, [chosen, isVariable, product.attributes, product.variationRefs]);

  const variation = matchRef ? variations.find((v) => v.id === matchRef.id) ?? null : null;

  // Show the selected variation's own photo in the gallery.
  const variationImage = variation?.image;
  useEffect(() => {
    if (variationImage) window.dispatchEvent(new CustomEvent("sc:variation-image", { detail: variationImage }));
  }, [variationImage]);

  // Is an option available given the other current choices?
  function optionAvailable(attrName: string, termName: string) {
    const trial = { ...chosen, [attrName]: termName };
    return product.variationRefs.some((ref) => {
      const v = variations.find((x) => x.id === ref.id);
      if (v && !v.is_in_stock) return false;
      return ref.attributes.every((ra) => {
        const attr = product.attributes.find((a) => norm(a.name) === norm(ra.name) || norm(a.taxonomy ?? "") === norm(ra.name));
        if (!attr || !ra.value) return true;
        const pick = trial[attr.name];
        if (!pick) return true;
        const term = attr.terms.find((t) => t.name === pick);
        return norm(ra.value) === norm(pick) || (term && norm(ra.value) === norm(term.slug));
      });
    });
  }

  const prices = variation?.prices ?? product.prices;
  const onSale = variation?.on_sale ?? product.on_sale;
  const inStock = variation ? variation.is_in_stock : product.is_in_stock;
  const sku = variation?.sku || product.sku;
  const ready = !isVariable || Boolean(variation);
  const max = product.soldIndividually ? 1 : Math.max(1, product.max || 99);

  async function submit(mode: "add" | "buy") {
    setError("");
    if (!ready) {
      setError(`Please choose a ${product.attributes.filter((a) => !chosen[a.name]).map((a) => a.name.toLowerCase()).join(" and ")}.`);
      return;
    }
    setBusy(mode);
    const body = isVariable
      ? {
          id: variation!.id,
          quantity: qty,
          variation: matchRef!.attributes.map((ra) => {
            const attr = product.attributes.find((a) => norm(a.name) === norm(ra.name) || norm(a.taxonomy ?? "") === norm(ra.name));
            const pick = attr ? chosen[attr.name] : "";
            return { attribute: attr?.taxonomy || attr?.name || ra.name, value: ra.value || pick };
          }),
        }
      : { id: product.id, quantity: qty };
    const ok = await addToCart(body, product.name);
    setBusy(null);
    if (ok && mode === "buy") router.push("/checkout");
  }

  return (
    <div>
      {sku && <p className="mt-3 text-sm text-foreground/80">SKU: {sku}</p>}
      <div className="mt-4">
        <Price prices={prices} onSale={onSale} large />
      </div>
      {summary && <p className="mt-5 text-[16px] leading-relaxed">{summary}</p>}

      {isVariable &&
        product.attributes.map((attr) => (
          <fieldset key={attr.name} className="mt-7">
            <legend className="mb-3 text-[15px]">
              {attr.name}
              {chosen[attr.name] && <span className="text-muted">: {chosen[attr.name]}</span>}
            </legend>
            <div className="flex flex-wrap gap-2">
              {attr.terms.map((t) => {
                const sel = chosen[attr.name] === t.name;
                const avail = optionAvailable(attr.name, t.name);
                return (
                  <button
                    key={t.id || t.name}
                    type="button"
                    aria-pressed={sel}
                    disabled={!avail}
                    onClick={() => {
                      const next = { ...chosen, [attr.name]: sel ? "" : t.name };
                      setChosen(next);
                      setError("");
                    }}
                    className={`min-w-12 rounded-lg border px-4 py-2 text-sm transition ${
                      sel
                        ? "border-heading bg-heading text-white"
                        : avail
                          ? "border-heading/30 bg-white hover:border-heading"
                          : "cursor-not-allowed border-line bg-card text-muted line-through"
                    }`}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}

      <div className="mt-7">
        <p className="mb-2 text-[15px]">Quantity</p>
        <div className="flex items-center gap-4">
          <div className="flex items-center rounded-lg border border-heading">
            <button type="button" aria-label="Decrease quantity" className="px-3.5 py-2.5 disabled:opacity-30" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))}>
              <Minus className="size-4" />
            </button>
            <input
              aria-label="Quantity"
              inputMode="numeric"
              value={qty}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                setQty(Number.isFinite(n) ? Math.min(max, Math.max(1, n)) : 1);
              }}
              className="w-10 bg-transparent text-center outline-none"
            />
            <button type="button" aria-label="Increase quantity" className="px-3.5 py-2.5 disabled:opacity-30" disabled={qty >= max} onClick={() => setQty((q) => Math.min(max, q + 1))}>
              <Plus className="size-4" />
            </button>
          </div>
          {!inStock && <span className="text-sm font-semibold text-[#7a2a1d]">Out of stock</span>}
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-[#7a2a1d]" role="alert">{error}</p>}

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={() => submit("add")}
          disabled={!inStock || !product.is_purchasable || busy !== null}
          className="flex-1 rounded-full bg-primary py-3.5 text-[15px] font-bold text-heading transition hover:bg-primary-hover hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "add" ? "Adding…" : "Add to Cart"}
        </button>
        <WishButton
          item={{ id: product.id, slug: product.slug, name: product.name, image: product.image, price: product.prices.price, sku }}
          className="size-[52px] border border-heading/30 !bg-white"
        />
      </div>
      <button
        type="button"
        onClick={() => submit("buy")}
        disabled={!inStock || !product.is_purchasable || busy !== null}
        className="mt-3 w-full rounded-full bg-heading py-3.5 text-[15px] font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy === "buy" ? "Please wait…" : "Buy Now"}
      </button>
    </div>
  );
}

"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown, Lock, Minus, NotebookPen, Plus, Tag, Trash2 } from "lucide-react";
import { useStore } from "@/components/StoreProvider";
import { decodeEntities, formatMoney } from "@/lib/format";

export default function CartPage() {
  const { cart, cartLoading, cartAction, notify } = useStore();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [promoOpen, setPromoOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    document.title = "My cart | Shop Celino";
    Promise.resolve().then(() => {
      try {
        const n = sessionStorage.getItem("sc_note");
        if (n) {
          setNote(n);
          setNoteOpen(true);
        }
      } catch {}
    });
  }, []);

  async function run(key: string, action: string, body: unknown) {
    setBusyKey(key);
    const { ok, data } = await cartAction(action, body);
    setBusyKey(null);
    if (!ok) notify(clean((data as { message?: string })?.message) || "Something went wrong. Please try again.", "error");
    return ok;
  }

  if (cartLoading && !cart) {
    return <div className="mx-auto max-w-[1440px] animate-pulse px-4 py-14 md:px-8"><div className="glass-card rounded-3xl p-8"><div className="h-10 w-48 rounded-lg bg-white/70" /><div className="mt-10 h-40 rounded-2xl bg-white/60" /></div></div>;
  }

  const items = cart?.items ?? [];
  const t = cart?.totals;

  if (!items.length) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-16 text-center md:px-8 md:py-24">
        <div className="glass-card mx-auto max-w-2xl rounded-3xl px-6 py-16">
        <h1 className="text-[40px]">Your cart is empty</h1>
        <p className="mt-3 text-muted">Find something you love and it will show up here.</p>
        <Link href="/shop" className="mt-8 inline-block rounded-full bg-heading px-8 py-3.5 font-semibold text-white transition hover:bg-primary hover:text-heading">
          Continue shopping
        </Link>
        </div>
      </div>
    );
  }

  const shippingKnown = cart!.has_calculated_shipping && t!.total_shipping !== null;

  return (
    <div className="mx-auto grid max-w-[1440px] items-start gap-6 px-4 py-10 md:px-8 md:py-14 lg:grid-cols-[1fr_420px] lg:gap-8">
      <section className="glass-card rounded-3xl px-5 py-6 sm:px-8 sm:py-8">
        <h1 className="glass-divider border-b pb-6 text-[34px]">My cart</h1>
        <ul>
          {items.map((it) => {
            const img = it.images[0];
            const busy = busyKey === it.key;
            return (
              <li key={it.key} className={`glass-divider grid grid-cols-[96px_1fr] gap-4 border-b py-6 transition-opacity sm:grid-cols-[128px_1fr_auto_auto_auto] sm:items-start sm:gap-6 ${busy ? "opacity-50" : ""}`}>
                <Link href={productPath(it.permalink)} className="overflow-hidden rounded-xl bg-card shadow-[0_8px_20px_-12px_rgba(34,32,29,.5)] ring-1 ring-white/80">
                  {img && <img src={img.thumbnail} alt={img.alt || decodeEntities(it.name)} className="aspect-[3/4] w-full object-cover object-top" />}
                </Link>
                <div>
                  <Link href={productPath(it.permalink)} className="text-[17px] hover:text-primary-hover">{decodeEntities(it.name)}</Link>
                  {it.variation.map((v) => (
                    <p key={v.attribute} className="mt-1 text-sm text-muted">{decodeEntities(v.attribute)}: {decodeEntities(v.value)}</p>
                  ))}
                  <p className="mt-1 text-sm text-muted">{formatMoney(it.prices.price, it.prices)} each</p>
                </div>
                <div className="glass-field col-start-2 flex w-fit items-center rounded-full px-1 sm:col-start-auto">
                  <button aria-label="Decrease quantity" disabled={busy || it.quantity <= it.quantity_limits.minimum} className="px-3.5 py-2.5 disabled:opacity-30" onClick={() => run(it.key, "update-item", { key: it.key, quantity: it.quantity - 1 })}>
                    <Minus className="size-4" />
                  </button>
                  <span className="w-8 text-center" aria-live="polite">{it.quantity}</span>
                  <button aria-label="Increase quantity" disabled={busy || it.quantity >= it.quantity_limits.maximum} className="px-3.5 py-2.5 disabled:opacity-30" onClick={() => run(it.key, "update-item", { key: it.key, quantity: it.quantity + 1 })}>
                    <Plus className="size-4" />
                  </button>
                </div>
                <p className="col-start-2 text-[17px] font-semibold sm:col-start-auto sm:w-24 sm:pt-2 sm:text-right">{formatMoney(it.totals.line_subtotal, it.totals)}</p>
                <button aria-label={`Remove ${decodeEntities(it.name)}`} disabled={busy} className="col-start-2 w-fit p-1 hover:text-[#7a2a1d] sm:col-start-auto sm:pt-2.5" onClick={() => run(it.key, "remove-item", { key: it.key })}>
                  <Trash2 className="size-5" strokeWidth={1.5} />
                </button>
              </li>
            );
          })}
        </ul>

        <div className="glass-divider border-b py-6">
          <button className="flex items-center gap-2 text-[17px] text-primary-hover" onClick={() => setPromoOpen((o) => !o)} aria-expanded={promoOpen}>
            <Tag className="size-5" strokeWidth={1.5} /> Enter a promo code <ChevronDown className={`size-4 transition-transform ${promoOpen ? "rotate-180" : ""}`} />
          </button>
          {promoOpen && (
            <form
              className="mt-4 flex max-w-md gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!code.trim()) return;
                if (await run("coupon", "apply-coupon", { code: code.trim() })) {
                  notify("Promo code applied");
                  setCode("");
                }
              }}
            >
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Promo code" aria-label="Promo code" className="glass-field flex-1 rounded-full px-4 py-2.5 outline-none" />
              <button disabled={busyKey === "coupon"} className="rounded-full bg-heading px-6 font-semibold text-white transition hover:bg-primary hover:text-heading disabled:opacity-50">Apply</button>
            </form>
          )}
          {cart!.coupons.map((c) => (
            <p key={c.code} className="mt-3 flex items-center gap-3 text-sm">
              <span className="rounded-full bg-secondary px-3 py-0.5 font-semibold uppercase">{c.code}</span>
              <button className="underline" onClick={() => run("coupon", "remove-coupon", { code: c.code })}>Remove</button>
            </p>
          ))}
        </div>

        <div className="py-6">
          <button className="flex items-center gap-2 text-[17px] text-primary-hover" onClick={() => setNoteOpen((o) => !o)} aria-expanded={noteOpen}>
            <NotebookPen className="size-5" strokeWidth={1.5} /> Add a note <ChevronDown className={`size-4 transition-transform ${noteOpen ? "rotate-180" : ""}`} />
          </button>
          {noteOpen && (
            <textarea
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                try { sessionStorage.setItem("sc_note", e.target.value); } catch {}
              }}
              maxLength={500}
              rows={4}
              aria-label="Order note"
              placeholder="Instructions for your order (optional)"
              className="glass-field mt-4 w-full max-w-xl rounded-2xl px-4 py-3 outline-none"
            />
          )}
        </div>
      </section>

      <aside className="self-stretch">
        <div className="glass rounded-3xl px-6 py-7 sm:px-8 lg:sticky lg:top-32">
          <h2 className="glass-divider border-b pb-6 text-[34px]">Order summary</h2>
          <dl className="glass-divider space-y-5 border-b py-7 text-[17px]">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(t!.total_items, t!)}</dd></div>
            {Number(t!.total_discount) > 0 && (
              <div className="flex justify-between text-primary-hover"><dt>Discount</dt><dd>−{formatMoney(t!.total_discount, t!)}</dd></div>
            )}
            {cart!.needs_shipping && (
              <div className="flex justify-between">
                <dt>Delivery</dt>
                <dd>{shippingKnown ? (Number(t!.total_shipping) === 0 ? "FREE" : formatMoney(t!.total_shipping, t!)) : <span className="text-muted">Calculated at checkout</span>}</dd>
              </div>
            )}
            {Number(t!.total_tax) > 0 && (
              <div className="flex justify-between"><dt>Tax</dt><dd>{formatMoney(t!.total_tax, t!)}</dd></div>
            )}
          </dl>
          <div className="flex items-baseline justify-between py-7">
            <span className="font-display text-2xl">Total</span>
            <span className="font-display text-2xl">{formatMoney(t!.total_price, t!)}</span>
          </div>
          <Link href="/checkout" className="block rounded-full bg-primary py-4 text-center text-[16px] font-bold text-heading shadow-[0_12px_26px_-12px_rgba(155,130,21,.75)] ring-1 ring-inset ring-white/30 transition hover:bg-primary-hover hover:text-white">
            Checkout
          </Link>
          <p className="mt-5 flex items-center justify-center gap-2 text-[15px]"><Lock className="size-4" /> Secure Checkout</p>
        </div>
      </aside>
    </div>
  );
}

function productPath(permalink: string) {
  const m = permalink.match(/\/product\/([^/]+)/);
  return m ? `/product/${m[1]}` : "/shop";
}

function clean(s?: string) {
  return s ? decodeEntities(s.replace(/<[^>]*>/g, "")) : "";
}

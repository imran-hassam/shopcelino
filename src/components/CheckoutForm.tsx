"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Lock } from "lucide-react";
import { useStore } from "./StoreProvider";
import { decodeEntities, formatMoney } from "@/lib/format";
import type { WCAddress } from "@/lib/types";
import type { Country, Gateway } from "@/lib/checkout-data";

/** Payment methods that need no card form in the page (handled fully by WooCommerce). */
const OFFLINE_METHODS = new Set(["cod", "bacs", "cheque"]);

type Addr = Omit<WCAddress, "email" | "company"> & { company?: string };
const emptyAddr = (country: string): Addr => ({
  first_name: "", last_name: "", address_1: "", address_2: "", city: "", state: "", postcode: "", country, phone: "",
});
const SAVE_KEY = "sc_checkout";

export function CheckoutForm({ countries, gateways, accountUrl }: { countries: Country[]; gateways: Gateway[]; accountUrl: string }) {
  const router = useRouter();
  const { cart, cartLoading, cartAction, refreshCart } = useStore();
  const defaultCountry = countries.find((c) => c.code === "US")?.code ?? countries[0]?.code ?? "US";

  const [email, setEmail] = useState("");
  const [ship, setShip] = useState<Addr>(() => emptyAddr(defaultCountry));
  const [billSame, setBillSame] = useState(true);
  const [bill, setBill] = useState<Addr>(() => emptyAddr(defaultCountry));
  const [save, setSave] = useState(false);
  const [paymentChoice, setPayment] = useState("");
  const [code, setCode] = useState("");
  const [placing, setPlacing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [couponMsg, setCouponMsg] = useState("");

  // Restore saved details
  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) {
          const s = JSON.parse(raw);
          if (s.email) setEmail(s.email);
          if (s.ship) setShip((a) => ({ ...a, ...s.ship }));
          setSave(true);
        }
      } catch {}
    });
  }, []);

  // Available payment methods = enabled in WooCommerce AND offered for this cart.
  const methods = useMemo(() => {
    const offered = new Set(cart?.payment_methods ?? []);
    return gateways.filter((g) => offered.size === 0 || offered.has(g.id));
  }, [cart?.payment_methods, gateways]);
  const usable = methods.filter((m) => OFFLINE_METHODS.has(m.id));

  const payment = paymentChoice || usable[0]?.id || "";

  // Send address to WooCommerce so it can work out shipping + tax.
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pushAddress = useCallback(
    (s: Addr, b: Addr, same: boolean) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        setUpdating(true);
        await cartAction("update-customer", {
          shipping_address: s,
          billing_address: { ...(same ? s : b), email: email || undefined },
        });
        setUpdating(false);
      }, 700);
    },
    [cartAction, email],
  );

  useEffect(() => {
    if (ship.country) pushAddress(ship, bill, billSame);
    // only re-quote when location fields change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ship.country, ship.state, ship.postcode, ship.city, billSame, bill.country, bill.state]);

  if (cartLoading && !cart) return <div className="mx-auto max-w-6xl animate-pulse px-5 py-16"><div className="h-[600px] rounded-xl bg-card" /></div>;

  if (!cart?.items.length) {
    return (
      <div className="px-5 py-28 text-center">
        <h1 className="text-[36px]">Your cart is empty</h1>
        <Link href="/shop" className="mt-8 inline-block rounded-full bg-heading px-8 py-3.5 font-semibold text-white">Continue shopping</Link>
      </div>
    );
  }

  const t = cart.totals;
  const rates = cart.shipping_rates.flatMap((p) => p.shipping_rates.map((r) => ({ ...r, package_id: p.package_id })));

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (cart!.needs_payment && !payment) {
      setError("Please choose a payment method.");
      return;
    }
    if (cart!.needs_shipping && rates.length === 0) {
      setError("Sorry, we can't deliver to this address yet. Please check the country and postcode.");
      return;
    }
    setPlacing(true);
    let note = "";
    try { note = sessionStorage.getItem("sc_note") ?? ""; } catch {}
    try {
      if (save) localStorage.setItem(SAVE_KEY, JSON.stringify({ email, ship }));
      else localStorage.removeItem(SAVE_KEY);
    } catch {}

    const billing = { ...(billSame ? ship : bill), email };
    const { ok, data } = await cartAction("checkout", {
      billing_address: billing,
      shipping_address: ship,
      customer_note: note,
      payment_method: payment,
      payment_data: [],
    });
    if (!ok) {
      setPlacing(false);
      const msg = (data as { message?: string })?.message;
      setError(msg ? decodeEntities(msg.replace(/<[^>]*>/g, "")) : "We couldn't place your order. Please check your details and try again.");
      return;
    }
    const order = data as { order_id: number; order_key: string; payment_result?: { payment_status?: string; redirect_url?: string } };
    try { sessionStorage.removeItem("sc_note"); } catch {}
    await refreshCart();
    const redirect = order.payment_result?.redirect_url ?? "";
    if (order.payment_result?.payment_status === "failure") {
      setPlacing(false);
      setError("Payment failed. Please try again or choose another method.");
      return;
    }
    // Off-site payment pages (e.g. PayPal) → go there; otherwise our confirmation page.
    if (redirect && !/order-received/.test(redirect) && /^https:\/\//.test(redirect)) {
      window.location.href = redirect;
      return;
    }
    router.push(`/order-received?order=${order.order_id}&key=${encodeURIComponent(order.order_key)}`);
  }

  return (
    <form onSubmit={placeOrder} className="mx-auto grid max-w-[1440px] lg:grid-cols-[1fr_minmax(420px,0.85fr)]">
      {/* LEFT: details */}
      <div className="order-2 px-5 py-10 md:px-16 lg:order-1 lg:border-r lg:border-line">
        <div className="mx-auto max-w-[800px]">
          <Section title="Contact information" aside={<a href={accountUrl} className="text-[15px] text-muted">Have an account? <span className="text-foreground underline">Log in</span></a>}>
            <Field label="Email">
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className={inputCls} />
            </Field>
          </Section>

          <Section title="Delivery">
            <AddressFields countries={countries} value={ship} onChange={setShip} prefix="shipping" />
            <label className="mt-4 flex items-center gap-2.5 text-[15px]">
              <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} className="size-4 accent-heading" />
              Save this information for next time (on this device)
            </label>
          </Section>

          {cart.needs_shipping && (
            <Section title="Shipping method">
              {rates.length === 0 ? (
                <p className="rounded-lg border border-line bg-white p-4 text-[15px] text-muted">
                  {updating ? "Checking delivery options…" : "Enter your address to see delivery options."}
                </p>
              ) : (
                <div className="space-y-2">
                  {rates.map((r) => (
                    <label key={r.rate_id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${r.selected ? "border-heading bg-accent/50" : "border-line bg-white"}`}>
                      <input
                        type="radio"
                        name="shipping"
                        checked={r.selected}
                        onChange={() => cartAction("select-shipping-rate", { package_id: r.package_id, rate_id: r.rate_id })}
                        className="mt-1 accent-heading"
                      />
                      <span className="flex-1">
                        <span className="block text-[16px]">{decodeEntities(r.name)}</span>
                        {(r.delivery_time || r.description) && <span className="text-sm text-muted">{decodeEntities(r.delivery_time || r.description)}</span>}
                      </span>
                      <span className="text-[16px]">{Number(r.price) === 0 ? "FREE" : formatMoney(r.price, r)}</span>
                    </label>
                  ))}
                </div>
              )}
            </Section>
          )}

          {cart.needs_payment && (
            <Section title="Payment" sub="All transactions are secure and encrypted.">
              {methods.length === 0 && (
                <p className="rounded-lg border border-line bg-white p-4 text-[15px]">
                  Online payment isn&apos;t available right now. Please contact us to complete your order.
                </p>
              )}
              <div className="space-y-2">
                {methods.map((m) => {
                  const ok = OFFLINE_METHODS.has(m.id);
                  return (
                    <label key={m.id} className={`block rounded-lg border p-4 transition ${payment === m.id ? "border-heading bg-accent/50" : "border-line bg-white"} ${ok ? "cursor-pointer" : "opacity-60"}`}>
                      <span className="flex items-center gap-3">
                        <input type="radio" name="payment" disabled={!ok} checked={payment === m.id} onChange={() => setPayment(m.id)} className="accent-heading" />
                        <span className="text-[16px]">{m.title}</span>
                      </span>
                      {payment === m.id && m.description && <span className="mt-2 block pl-7 text-sm text-muted">{m.description}</span>}
                      {!ok && <span className="mt-2 block pl-7 text-sm text-muted">Coming soon on this site.</span>}
                    </label>
                  );
                })}
              </div>
            </Section>
          )}

          <Section title="Billing address">
            <div className="space-y-2">
              {[true, false].map((same) => (
                <label key={String(same)} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 ${billSame === same ? "border-heading bg-accent/50" : "border-line bg-white"}`}>
                  <input type="radio" name="billing" checked={billSame === same} onChange={() => setBillSame(same)} className="accent-heading" />
                  {same ? "Same as shipping address" : "Use a different billing address"}
                </label>
              ))}
            </div>
            {!billSame && (
              <div className="mt-5">
                <AddressFields countries={countries} value={bill} onChange={setBill} prefix="billing" />
              </div>
            )}
          </Section>

          {error && <p role="alert" className="mt-6 rounded-lg bg-[#7a2a1d]/10 p-4 text-[15px] text-[#7a2a1d]">{error}</p>}

          <button
            type="submit"
            disabled={placing || updating}
            className="mt-8 w-full rounded-lg bg-heading py-4 text-[16px] font-bold text-white transition hover:bg-black disabled:opacity-60"
          >
            {placing ? "Placing order…" : cart.needs_payment ? `Pay now · ${formatMoney(t.total_price, t)}` : "Place order"}
          </button>
          <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted"><Lock className="size-3.5" /> Secure checkout · Your information is protected</p>
        </div>
      </div>

      {/* RIGHT: summary */}
      <aside className="order-1 bg-card/70 px-5 py-8 md:px-16 lg:order-2 lg:py-10">
        <details className="group lg:hidden" open={false}>
          <summary className="flex cursor-pointer list-none items-center justify-between text-[16px]">
            <span className="flex items-center gap-2">Order summary <ChevronDown className="size-4 transition-transform group-open:rotate-180" /></span>
            <span className="font-semibold">{formatMoney(t.total_price, t)}</span>
          </summary>
          <div className="mt-6">{summary()}</div>
        </details>
        <div className="hidden lg:sticky lg:top-32 lg:block">
          <h2 className="mb-7 text-[26px]">Order summary</h2>
          {summary()}
        </div>
      </aside>
    </form>
  );

  function summary() {
    return (
      <div className="max-w-[440px]">
        <ul className="space-y-5">
          {cart!.items.map((it) => (
            <li key={it.key} className="flex items-center gap-4">
              <span className="relative w-16 shrink-0">
                {it.images[0] && <img src={it.images[0].thumbnail} alt="" className="aspect-[3/4] w-full rounded-lg bg-white object-cover object-top" />}
                <span className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-muted text-[11px] font-bold text-white">{it.quantity}</span>
              </span>
              <span className="flex-1 text-[15px]">
                {decodeEntities(it.name)}
                {it.variation.length > 0 && <span className="block text-sm text-muted">{it.variation.map((v) => decodeEntities(v.value)).join(" / ")}</span>}
              </span>
              <span className="text-[15px]">{formatMoney(it.totals.line_subtotal, it.totals)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Discount code"
            aria-label="Discount code"
            className="flex-1 rounded-l-lg border border-line bg-white px-4 py-3 outline-none focus:border-heading"
          />
          <button
            type="button"
            disabled={!code.trim()}
            onClick={async () => {
              setCouponMsg("");
              const { ok, data } = await cartAction("apply-coupon", { code: code.trim() });
              if (ok) setCode("");
              else setCouponMsg(decodeEntities(((data as { message?: string })?.message ?? "Invalid code").replace(/<[^>]*>/g, "")));
            }}
            className="rounded-r-lg bg-heading px-5 font-semibold text-white transition disabled:bg-muted/40"
          >
            Apply
          </button>
        </div>
        {couponMsg && <p className="mt-2 text-sm text-[#7a2a1d]">{couponMsg}</p>}
        {cart!.coupons.map((c) => (
          <p key={c.code} className="mt-3 flex items-center gap-3 text-sm">
            <span className="rounded bg-secondary px-2 py-0.5 font-semibold uppercase">{c.code}</span>
            <button type="button" className="underline" onClick={() => cartAction("remove-coupon", { code: c.code })}>Remove</button>
          </p>
        ))}
        <dl className="mt-6 space-y-3 border-b border-line pb-6 text-[15px]">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(t.total_items, t)}</dd></div>
          {Number(t.total_discount) > 0 && <div className="flex justify-between"><dt>Discount</dt><dd>−{formatMoney(t.total_discount, t)}</dd></div>}
          {cart!.needs_shipping && (
            <div className="flex justify-between">
              <dt>Shipping</dt>
              <dd>{t.total_shipping === null || !cart!.has_calculated_shipping ? <span className="text-muted">Enter address</span> : Number(t.total_shipping) === 0 ? "FREE" : formatMoney(t.total_shipping, t)}</dd>
            </div>
          )}
          {Number(t.total_tax) > 0 && <div className="flex justify-between"><dt>Tax</dt><dd>{formatMoney(t.total_tax, t)}</dd></div>}
        </dl>
        <div className="flex items-baseline justify-between pt-6">
          <span className="text-xl">Total</span>
          <span className="text-2xl"><span className="mr-2 text-xs text-muted">{t.currency_code}</span>{formatMoney(t.total_price, t)}</span>
        </div>
        {updating && <p className="mt-3 text-sm text-muted">Updating totals…</p>}
      </div>
    );
  }
}

const inputCls =
  "w-full rounded-md border border-heading/25 bg-white px-4 py-3 text-[16px] outline-none transition placeholder:text-muted focus:border-heading";

function Section({ title, sub, aside, children }: { title: string; sub?: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[22px]">{title}</h2>
        {aside}
      </div>
      {sub && <p className="-mt-2 mb-4 text-sm text-muted">{sub}</p>}
      {children}
    </section>
  );
}

function Field({ label, children, optional }: { label: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[15px]">
        {label} {optional && <span className="text-muted">(optional)</span>}
      </span>
      {children}
    </label>
  );
}

function AddressFields({
  countries,
  value,
  onChange,
  prefix,
}: {
  countries: Country[];
  value: Addr;
  onChange: (a: Addr) => void;
  prefix: "shipping" | "billing";
}) {
  const set = (k: keyof Addr) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ ...value, [k]: e.target.value });
  const states = countries.find((c) => c.code === value.country)?.states ?? [];
  const ac = (s: string) => `${prefix} ${s}`;
  return (
    <div className="grid gap-4">
      <Field label="Country/Region">
        {countries.length ? (
          <select required value={value.country} onChange={(e) => onChange({ ...value, country: e.target.value, state: "" })} autoComplete={ac("country")} className={inputCls}>
            {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        ) : (
          <input required value={value.country} onChange={set("country")} placeholder="Country code (e.g. US)" className={inputCls} />
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name"><input required value={value.first_name} onChange={set("first_name")} autoComplete={ac("given-name")} placeholder="First name" className={inputCls} /></Field>
        <Field label="Last name"><input required value={value.last_name} onChange={set("last_name")} autoComplete={ac("family-name")} placeholder="Last name" className={inputCls} /></Field>
      </div>
      <Field label="Address"><input required value={value.address_1} onChange={set("address_1")} autoComplete={ac("address-line1")} placeholder="Street address" className={inputCls} /></Field>
      <Field label="Apartment, suite, etc." optional><input value={value.address_2} onChange={set("address_2")} autoComplete={ac("address-line2")} placeholder="Apartment, suite, etc." className={inputCls} /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="City"><input required value={value.city} onChange={set("city")} autoComplete={ac("address-level2")} placeholder="City" className={inputCls} /></Field>
        <Field label="State">
          {states.length ? (
            <select required value={value.state} onChange={set("state")} autoComplete={ac("address-level1")} className={inputCls}>
              <option value="">Select…</option>
              {states.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
          ) : (
            <input value={value.state} onChange={set("state")} autoComplete={ac("address-level1")} placeholder="State / Province" className={inputCls} />
          )}
        </Field>
        <Field label="ZIP / Postal code"><input required value={value.postcode} onChange={set("postcode")} autoComplete={ac("postal-code")} placeholder="ZIP code" className={inputCls} /></Field>
      </div>
      <Field label="Phone"><input required type="tel" value={value.phone} onChange={set("phone")} autoComplete={ac("tel")} placeholder="Phone" className={inputCls} /></Field>
    </div>
  );
}

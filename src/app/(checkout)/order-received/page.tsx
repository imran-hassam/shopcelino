import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CheckCircle2 } from "lucide-react";
import { adminGet } from "@/lib/woo";
import { decodeEntities } from "@/lib/format";

export const metadata: Metadata = { title: "Order received", robots: { index: false } };

type Order = {
  id: number;
  number: string;
  order_key: string;
  status: string;
  currency_symbol: string;
  total: string;
  shipping_total: string;
  discount_total: string;
  total_tax: string;
  payment_method_title: string;
  date_created: string;
  billing: { email: string; first_name: string };
  shipping: { first_name: string; last_name: string; address_1: string; address_2: string; city: string; state: string; postcode: string; country: string };
  line_items: { id: number; name: string; quantity: number; total: string; image?: { src: string } }[];
};

export default function OrderReceived({ searchParams }: PageProps<"/order-received">) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-card" />}>
        <OrderDetails searchParams={searchParams as Promise<Record<string, string | undefined>>} />
      </Suspense>
    </div>
  );
}

async function OrderDetails({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const id = Number(sp.order);
  const key = sp.key ?? "";
  let order: Order | null = null;
  if (id > 0 && key) {
    try {
      const res = await adminGet(`/orders/${id}`);
      if (res.ok) {
        const o = (await res.json()) as Order;
        if (o.order_key === key) order = o; // only show the order to whoever holds its key
      }
    } catch {}
  }

  if (!order) {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-14 text-primary-hover" strokeWidth={1.25} />
        <h1 className="mt-6 text-[36px]">Thank you for your order</h1>
        <p className="mt-3 text-muted">A confirmation email is on its way to you.</p>
        <Link href="/shop" className="mt-8 inline-block rounded-full bg-heading px-8 py-3.5 font-semibold text-white">Continue shopping</Link>
      </div>
    );
  }

  const money = (v: string) => `${order!.currency_symbol}${Number(v).toFixed(2)}`;
  const s = order.shipping;
  return (
    <div>
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-14 text-primary-hover" strokeWidth={1.25} />
        <h1 className="mt-6 text-[36px]">Thank you{order.billing.first_name ? `, ${order.billing.first_name}` : ""}!</h1>
        <p className="mt-3 text-[17px]">Your order <strong>#{order.number}</strong> has been received.</p>
        <p className="mt-1 text-muted">A confirmation has been sent to {order.billing.email}.</p>
      </div>

      <div className="mt-12 rounded-2xl bg-white p-6 shadow-sm md:p-8">
        <ul className="divide-y divide-line">
          {order.line_items.map((li) => (
            <li key={li.id} className="flex items-center justify-between gap-4 py-4">
              <span>{decodeEntities(li.name)} <span className="text-muted">× {li.quantity}</span></span>
              <span>{money(li.total)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-line pt-4 text-[15px]">
          {Number(order.discount_total) > 0 && <div className="flex justify-between"><dt>Discount</dt><dd>−{money(order.discount_total)}</dd></div>}
          <div className="flex justify-between"><dt>Shipping</dt><dd>{Number(order.shipping_total) === 0 ? "FREE" : money(order.shipping_total)}</dd></div>
          {Number(order.total_tax) > 0 && <div className="flex justify-between"><dt>Tax</dt><dd>{money(order.total_tax)}</dd></div>}
          <div className="flex justify-between pt-2 text-xl font-display"><dt>Total</dt><dd>{money(order.total)}</dd></div>
        </dl>
        <div className="mt-8 grid gap-6 border-t border-line pt-6 text-[15px] sm:grid-cols-2">
          <div>
            <p className="font-semibold">Delivery address</p>
            <p className="mt-1 text-foreground/80">
              {s.first_name} {s.last_name}<br />{s.address_1}{s.address_2 ? `, ${s.address_2}` : ""}<br />{s.city}, {s.state} {s.postcode}<br />{s.country}
            </p>
          </div>
          <div>
            <p className="font-semibold">Payment</p>
            <p className="mt-1 text-foreground/80">{order.payment_method_title || "—"}</p>
          </div>
        </div>
      </div>
      <div className="mt-10 text-center">
        <Link href="/shop" className="inline-block rounded-full bg-heading px-8 py-3.5 font-semibold text-white">Continue shopping</Link>
      </div>
    </div>
  );
}

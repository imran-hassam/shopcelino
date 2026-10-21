import type { Metadata } from "next";
import { Suspense } from "react";
import { getCheckoutCountries, getGateways } from "@/lib/checkout-data";
import { CheckoutForm } from "@/components/CheckoutForm";
import { ACCOUNT_URL } from "@/lib/site-urls";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl animate-pulse px-5 py-16"><div className="h-[600px] rounded-xl bg-card" /></div>}>
      <CheckoutLoader />
    </Suspense>
  );
}

async function CheckoutLoader() {
  const [countries, gateways] = await Promise.all([getCheckoutCountries(), getGateways()]);
  return <CheckoutForm countries={countries} gateways={gateways} accountUrl={ACCOUNT_URL} />;
}

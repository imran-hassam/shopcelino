import { Header } from "@/components/Header";
import { ACCOUNT_URL, LOGO_URL } from "@/lib/site-urls";

// Checkout uses the same site header as every other page.
export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header logoUrl={LOGO_URL} accountUrl={ACCOUNT_URL} />
      <main id="main" className="flex-1">{children}</main>
    </>
  );
}

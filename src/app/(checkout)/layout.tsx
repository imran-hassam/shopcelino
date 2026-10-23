import { Header } from "@/components/Header";
import { ACCOUNT_URL, LOGO_URL } from "@/lib/site-urls";
import { getMegaMenu } from "@/lib/mega";

// Checkout uses the same site header as every other page.
export default async function CheckoutLayout({ children }: { children: React.ReactNode }) {
  const mega = await getMegaMenu().catch(() => null);
  return (
    <>
      <Header logoUrl={LOGO_URL} accountUrl={ACCOUNT_URL} mega={mega} />
      <main id="main" className="flex-1">{children}</main>
    </>
  );
}

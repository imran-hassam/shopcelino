import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ACCOUNT_URL, LOGO_URL } from "@/lib/site-urls";
import { getMegaMenu } from "@/lib/mega";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const mega = await getMegaMenu().catch(() => null);
  return (
    <>
      <Header logoUrl={LOGO_URL} accountUrl={ACCOUNT_URL} mega={mega} />
      <main id="main" className="flex-1">{children}</main>
      <Footer logoUrl={LOGO_URL} accountUrl={ACCOUNT_URL} />
    </>
  );
}

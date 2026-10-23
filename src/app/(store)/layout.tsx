import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ACCOUNT_URL, LOGO_URL } from "@/lib/site-urls";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header logoUrl={LOGO_URL} accountUrl={ACCOUNT_URL} />
      <main id="main" className="flex-1">{children}</main>
      <Footer logoUrl={LOGO_URL} accountUrl={ACCOUNT_URL} />
    </>
  );
}

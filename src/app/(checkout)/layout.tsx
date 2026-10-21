import Link from "next/link";
import { Lock } from "lucide-react";
import { Logo } from "@/components/Logo";
import { LOGO_URL } from "@/lib/site-urls";

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-5 md:px-16">
          <Link href="/" aria-label="Back to Shop Celino">
            <Logo src={LOGO_URL} className="h-10" />
          </Link>
          <p className="flex items-center gap-2 text-[16px]"><Lock className="size-4" /> Secure Checkout</p>
        </div>
      </header>
      <main id="main" className="flex-1">{children}</main>
    </>
  );
}

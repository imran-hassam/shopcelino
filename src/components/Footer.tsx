import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { MENU_CATEGORIES, SITE } from "@/lib/config";
import { CONTACT } from "@/lib/contact";
import { Logo } from "./Logo";
import { BackToTop } from "./BackToTop";

export function Footer({ logoUrl, accountUrl }: { logoUrl: string; accountUrl: string }) {
  return (
    <footer className="relative isolate mt-auto overflow-hidden bg-footer text-footer-text">
      {/* Soft brand-gold light behind the glass panel */}
      <div aria-hidden className="pointer-events-none absolute -left-40 -top-40 -z-10 size-[520px] rounded-full bg-primary/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-48 right-0 -z-10 size-[480px] rounded-full bg-secondary/10 blur-3xl" />
      <div className="mx-auto max-w-[1440px] px-4 pt-10 md:px-8 md:pt-14">
      <div className="glass-dark grid gap-12 rounded-3xl px-6 py-12 md:grid-cols-2 md:px-10 lg:grid-cols-[1.6fr_1fr_1fr_1.3fr]">
        <div>
          <Link href="/" className="inline-block rounded-2xl bg-background px-4 py-3 shadow-[0_10px_24px_-14px_rgba(0,0,0,.6)] ring-1 ring-white/40" aria-label="Shop Celino home">
            <Logo src={logoUrl} className="h-9" />
          </Link>
          <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-footer-text/75">{SITE.tagline}</p>
        </div>

        <div>
          <h2 className="text-xl !text-footer-text">Shop</h2>
          <ul className="mt-6 space-y-3 text-[15px] text-footer-text/75">
            {MENU_CATEGORIES.slice(0, 6).map((c) => (
              <li key={c.slug}>
                <Link href={`/shop?category=${c.slug}`} className="transition-colors hover:text-primary">
                  {c.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/shop" className="transition-colors hover:text-primary">Shop All</Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl !text-footer-text">Quick Links</h2>
          <ul className="mt-6 space-y-3 text-[15px] text-footer-text/75">
            <li><Link href="/about" className="transition-colors hover:text-primary">About Us</Link></li>
            <li><Link href="/contact" className="transition-colors hover:text-primary">Contact Us</Link></li>
            <li><Link href="/wishlist" className="transition-colors hover:text-primary">Wishlist</Link></li>
            <li><Link href="/cart" className="transition-colors hover:text-primary">Cart</Link></li>
            <li><a href={accountUrl} className="transition-colors hover:text-primary">My Account</a></li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl !text-footer-text">Get in Touch</h2>
          <ul className="mt-6 space-y-4 text-[15px] text-footer-text/75">
            <li className="flex gap-3">
              <span className="glass-dark -mt-1.5 grid size-9 shrink-0 place-items-center rounded-full"><MapPin className="size-[18px] text-primary" strokeWidth={1.5} /></span>
              <span>{CONTACT.address.join(", ")}</span>
            </li>
            <li className="flex gap-3">
              <span className="glass-dark -mt-1.5 grid size-9 shrink-0 place-items-center rounded-full"><Mail className="size-[18px] text-primary" strokeWidth={1.5} /></span>
              <a href={`mailto:${CONTACT.email}`} className="hover:text-primary">{CONTACT.email}</a>
            </li>
            <li className="flex gap-3">
              <span className="glass-dark -mt-1.5 grid size-9 shrink-0 place-items-center rounded-full"><Phone className="size-[18px] text-primary" strokeWidth={1.5} /></span>
              <a href={`tel:${CONTACT.phone.replace(/[^\d+]/g, "")}`} className="hover:text-primary">{CONTACT.phone}</a>
            </li>
          </ul>
        </div>
      </div>
      </div>
      <div>
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-3 px-5 py-6 text-sm text-footer-text/70 md:flex-row md:px-8">
          <p>© <Year /> {SITE.name}. All rights reserved.</p>
          <p className="text-footer-text/55">Prices in USD</p>
        </div>
      </div>
      <BackToTop />
    </footer>
  );
}

async function Year() {
  "use cache";
  return <>{new Date().getFullYear()}</>;
}

import Link from "next/link";
import { MENU_CATEGORIES } from "@/lib/config";


/** 404 page. Shown for links that don't exist here — including men's and kids' items, which this women's store doesn't carry. */
export default function NotFound() {
  return (
    <main id="main" className="flex-1">
    <div className="mx-auto max-w-[1440px] px-4 py-16 md:px-8 md:py-24">
      <div className="glass-card mx-auto max-w-2xl rounded-3xl px-6 py-14 text-center">
        <p className="font-display text-7xl text-primary">404</p>
        <h1 className="mt-4 text-[34px]">We couldn&apos;t find that page</h1>
        <p className="mx-auto mt-3 max-w-md text-muted">
          It may have moved, or the item is no longer available. Our women&apos;s collections are a good place to look next.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/shop" className="rounded-full bg-heading px-7 py-3 font-semibold text-white transition hover:bg-primary hover:text-heading">
            Shop women&apos;s fashion
          </Link>
          <Link href="/" className="glass-chip rounded-full px-7 py-3 font-semibold transition-colors hover:border-primary hover:text-primary-hover">
            Go to the homepage
          </Link>
        </div>
        <ul className="mt-10 flex flex-wrap justify-center gap-2 text-[14px]">
          {MENU_CATEGORIES.map((c) => (
            <li key={c.slug}>
              <Link href={`/shop?category=${c.slug}`} className="glass-chip inline-block rounded-full px-3.5 py-1.5 transition-colors hover:border-primary hover:text-primary-hover">
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
    </main>
  );
}

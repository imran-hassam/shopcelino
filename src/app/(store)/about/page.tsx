import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getWpPage } from "@/lib/woo";
import { decodeEntities, sanitizeHtml } from "@/lib/format";
import { SITE } from "@/lib/config";

export const metadata: Metadata = { title: "About Us", alternates: { canonical: "/about" } };

export default function AboutPage() {
  return (
    <Suspense fallback={<div className="mx-auto my-24 h-96 max-w-3xl animate-pulse rounded-xl bg-card" />}>
      <AboutContent />
    </Suspense>
  );
}

async function AboutContent() {
  // If an "About Us" page exists in WordPress, its content is shown here.
  const page = (await getWpPage("about-us")) ?? (await getWpPage("about"));
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 md:py-24">
      <h1 className="text-center text-[44px] md:text-[60px]">{page ? decodeEntities(page.title.rendered) : "About Us"}</h1>
      {page ? (
        <div className="prose-wc mt-10 text-[17px]" dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.content.rendered) }} />
      ) : (
        <div className="mt-10 space-y-5 text-center text-[18px] leading-relaxed">
          <p className="font-display text-2xl">{SITE.tagline}</p>
          <p>Shop Celino brings together dresses, lingerie, sleepwear, men&apos;s tailoring and kids&apos; wear in one place.</p>
          <Link href="/shop" className="mt-6 inline-block rounded-full bg-heading px-8 py-3.5 text-[15px] font-semibold text-white">Explore the collection</Link>
        </div>
      )}
    </div>
  );
}

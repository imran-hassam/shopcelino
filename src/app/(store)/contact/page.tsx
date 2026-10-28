import type { Metadata } from "next";
import { CONTACT } from "@/lib/contact";
import { ContactForm } from "@/components/ContactForm";
import { Reveal } from "@/components/Reveal";
import { PageHero } from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Questions about an order or a product? Get in touch with the Shop Celino team.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const mapQuery = encodeURIComponent(CONTACT.address.join(", "));
  return (
    <>
    <PageHero
      title="Contact Us"
      crumbs={[{ label: "Contact Us" }]}
      description="Questions about sizing, an order or delivery? We're here to help."
    />
    <div className="mx-auto max-w-[1440px] px-5 pb-24 pt-10 md:px-8 md:pt-14">

      <div className="grid gap-12 lg:grid-cols-2 lg:gap-14">
        <Reveal>
          <ContactForm to={CONTACT.email} />
        </Reveal>

        <Reveal delay={120}>
          <div className="glass-card rounded-3xl p-6 sm:p-8">
          <h2 className="font-sans text-[26px] font-semibold">Visit Our Store</h2>
          <address className="mt-4 text-[17px] not-italic leading-relaxed">
            {CONTACT.address.map((l) => (
              <span key={l} className="block">{l}</span>
            ))}
          </address>
          <p className="mt-6 text-[17px]"><strong>Mail:</strong> <a href={`mailto:${CONTACT.email}`} className="hover:text-primary-hover">{CONTACT.email}</a></p>
          <p className="mt-2 text-[17px]"><strong>Tel:</strong> <a href={`tel:${CONTACT.phone.replace(/[^\d+]/g, "")}`} className="hover:text-primary-hover">{CONTACT.phone}</a></p>
          <div className="mt-8 overflow-hidden rounded-2xl shadow-[0_20px_40px_-26px_rgba(34,32,29,.55)] ring-1 ring-white/80">
            <iframe
              title="Map showing our location"
              src={`https://maps.google.com/maps?q=${mapQuery}&z=14&output=embed`}
              className="h-[380px] w-full md:h-[460px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          </div>
        </Reveal>
      </div>
    </div>
    </>
  );
}

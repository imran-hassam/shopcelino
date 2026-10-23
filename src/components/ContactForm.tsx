"use client";

import { useState } from "react";

/**
 * There is no form plugin on the WordPress site yet, so this opens the visitor's
 * email app with the message filled in, addressed to the store.
 */
export function ContactForm({ to }: { to: string }) {
  const [sent, setSent] = useState(false);
  const field =
    "w-full rounded-lg border border-heading/20 bg-background px-4 py-3 text-[16px] outline-none transition placeholder:text-muted hover:border-heading/40 focus:border-primary-hover focus:bg-white";
  const label = "mb-2 block text-[15px] font-medium";
  return (
    <form
      className="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const body = `Name: ${f.get("name")}\nEmail: ${f.get("email")}\nPhone: ${f.get("phone")}\n\n${f.get("message")}`;
        window.location.href = `mailto:${to}?subject=${encodeURIComponent(`Website enquiry from ${f.get("name")}`)}&body=${encodeURIComponent(body)}`;
        setSent(true);
      }}
    >
      <h2 className="font-sans text-[26px] font-semibold">Send us a message</h2>
      <p className="mt-2 text-[15px] text-muted">Fields marked * are required.</p>

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className={label}>Full name *</span>
          <input name="name" required autoComplete="name" placeholder="Your name" className={field} />
        </label>
        <label className="block">
          <span className={label}>Email *</span>
          <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" className={field} />
        </label>
        <label className="block">
          <span className={label}>Phone *</span>
          <input name="phone" type="tel" required autoComplete="tel" placeholder="Phone" className={field} />
        </label>
        <label className="block sm:col-span-2">
          <span className={label}>Message *</span>
          <textarea name="message" required rows={6} placeholder="Enter your message here..." className={`${field} min-h-[150px] resize-y`} />
        </label>
      </div>

      <button className="mt-7 w-full rounded-full bg-heading px-12 py-3.5 text-[16px] font-bold text-white transition hover:bg-primary hover:text-heading sm:w-auto">
        Submit
      </button>
      {sent && <p className="mt-4 text-sm" role="status">Your email app should open with your message ready to send.</p>}
    </form>
  );
}

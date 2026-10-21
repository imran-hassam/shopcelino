"use client";

import { useState } from "react";

/**
 * There is no form plugin on the WordPress site yet, so this opens the visitor's
 * email app with the message filled in, addressed to the store.
 */
export function ContactForm({ to }: { to: string }) {
  const [sent, setSent] = useState(false);
  const field = "w-full rounded-full border border-heading/25 bg-white px-5 py-3 text-[16px] outline-none transition placeholder:text-muted focus:border-heading";
  return (
    <form
      className="rounded-2xl bg-accent p-6 md:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const body = `Name: ${f.get("name")}\nEmail: ${f.get("email")}\nPhone: ${f.get("phone")}\n\n${f.get("message")}`;
        window.location.href = `mailto:${to}?subject=${encodeURIComponent(`Website enquiry from ${f.get("name")}`)}&body=${encodeURIComponent(body)}`;
        setSent(true);
      }}
    >
      <div className="space-y-5">
        <label className="block">
          <span className="mb-2 block text-[17px]">Full name *</span>
          <input name="name" required autoComplete="name" placeholder="Your name" className={field} />
        </label>
        <label className="block">
          <span className="mb-2 block text-[17px]">Email *</span>
          <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" className={field} />
        </label>
        <label className="block">
          <span className="mb-2 block text-[17px]">Phone *</span>
          <input name="phone" type="tel" required autoComplete="tel" placeholder="Phone" className={field} />
        </label>
        <label className="block">
          <span className="mb-2 block text-[17px]">Message *</span>
          <textarea name="message" required rows={6} placeholder="Enter your message here..." className={`${field} rounded-2xl`} />
        </label>
      </div>
      <button className="mt-7 rounded-full bg-heading px-14 py-4 text-[16px] font-bold text-white transition hover:bg-primary hover:text-heading">
        Submit
      </button>
      {sent && <p className="mt-4 text-sm" role="status">Your email app should open with your message ready to send.</p>}
    </form>
  );
}

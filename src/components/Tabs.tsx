"use client";

import { useState } from "react";

export function Tabs({ tabs }: { tabs: { label: string; content: React.ReactNode }[] }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div role="tablist" className="mx-auto flex w-fit rounded-full bg-card p-1.5">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            role="tab"
            aria-selected={active === i}
            onClick={() => setActive(i)}
            className={`rounded-full px-6 py-2.5 text-[15px] transition-all ${
              active === i ? "bg-white shadow-sm" : "text-foreground/70 hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-12">
        {tabs.map((t, i) => (
          <div key={t.label} role="tabpanel" hidden={active !== i} className="animate-[fadein_.5s_ease]">
            {t.content}
          </div>
        ))}
      </div>
    </div>
  );
}

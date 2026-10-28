"use client";

import { useState } from "react";

export function Tabs({ tabs }: { tabs: { label: string; content: React.ReactNode }[] }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div role="tablist" className="glass-chip mx-auto flex w-fit rounded-full p-1.5">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            role="tab"
            aria-selected={active === i}
            onClick={() => setActive(i)}
            className={`rounded-full px-6 py-2.5 text-[15px] transition-all ${
              active === i ? "bg-white shadow-[0_6px_16px_-8px_rgba(34,32,29,.4)]" : "text-foreground/70 hover:bg-white/50 hover:text-foreground"
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

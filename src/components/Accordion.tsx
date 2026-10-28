"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

export function Accordion({ items }: { items: { title: string; html: string }[] }) {
  const [open, setOpen] = useState(0);
  return (
    <div>
      {items.map((it, i) => (
        <div key={it.title} className="glass-divider border-t first:border-t-0">
          <button
            className="flex w-full items-center justify-between py-5 text-left font-display text-xl"
            onClick={() => setOpen(open === i ? -1 : i)}
            aria-expanded={open === i}
          >
            {it.title}
            <ChevronDown className={`size-5 transition-transform ${open === i ? "rotate-180" : ""}`} strokeWidth={1.5} />
          </button>
          <div className={`grid transition-all duration-300 ${open === i ? "grid-rows-[1fr] pb-6" : "grid-rows-[0fr]"}`}>
            <div className="prose-wc overflow-hidden text-[15px] text-foreground/85" dangerouslySetInnerHTML={{ __html: it.html }} />
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const OPTIONS = [
  ["featured", "Featured"],
  ["newest", "Newest"],
  ["popular", "Most popular"],
  ["price-asc", "Price: low to high"],
  ["price-desc", "Price: high to low"],
  ["name", "Name: A–Z"],
] as const;

export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  return (
    <label className="glass-field flex items-center gap-2 rounded-full px-4 py-2 text-[15px]">
      <span className="text-muted">Sort by:</span>
      <select
        value={value}
        onChange={(e) => {
          const p = new URLSearchParams(sp.toString());
          p.delete("page");
          if (e.target.value === "featured") p.delete("sort");
          else p.set("sort", e.target.value);
          const s = p.toString();
          router.push(`${pathname}${s ? `?${s}` : ""}`, { scroll: false });
        }}
        className="bg-transparent pr-1 outline-none"
      >
        {OPTIONS.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  );
}

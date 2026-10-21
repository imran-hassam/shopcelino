type Money = {
  currency_minor_unit: number;
  currency_prefix: string;
  currency_suffix: string;
};

/** Store API prices are strings in minor units ("2099" → $20.99). */
export function formatMoney(amount: string | number | null | undefined, m: Money) {
  const n = Number(amount ?? 0) / Math.pow(10, m.currency_minor_unit ?? 2);
  const s = n.toLocaleString("en-US", {
    minimumFractionDigits: m.currency_minor_unit ?? 2,
    maximumFractionDigits: m.currency_minor_unit ?? 2,
  });
  return `${m.currency_prefix ?? ""}${s}${m.currency_suffix ?? ""}`;
}

/** Decode HTML entities WordPress puts in names (&#8217; etc.). */
export function decodeEntities(s: string) {
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

export function stripHtml(html: string) {
  return decodeEntities(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

/**
 * Remove scripts, styles, iframes, event handlers and javascript: URLs from
 * WordPress HTML before rendering it. Content comes from the store owner's own
 * backend, this is a defence-in-depth pass.
 */
export function sanitizeHtml(html: string) {
  return html
    .replace(/<(script|style|iframe|object|embed|form)[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|iframe|object|embed|link|meta)[^>]*\/?>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, "$1=$2#$2");
}

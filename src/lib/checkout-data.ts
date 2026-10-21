import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { adminGet } from "./woo";

export type Country = { code: string; name: string; states: { code: string; name: string }[] };
export type Gateway = { id: string; title: string; description: string };

/** Countries the store sells to (from WooCommerce settings), with their states. */
export async function getCheckoutCountries(): Promise<Country[]> {
  "use cache";
  cacheTag("settings");
  try {
    const [cRes, sRes] = await Promise.all([adminGet("/data/countries"), adminGet("/settings/general")]);
    if (!cRes.ok) throw new Error(`countries ${cRes.status}`);
    const all = (await cRes.json()) as Country[];
    let allowed: string[] | null = null;
    if (sRes.ok) {
      const settings = (await sRes.json()) as { id: string; value: unknown }[];
      const mode = settings.find((s) => s.id === "woocommerce_allowed_countries")?.value;
      const specific = settings.find((s) => s.id === "woocommerce_specific_allowed_countries")?.value;
      const except = settings.find((s) => s.id === "woocommerce_all_except_countries")?.value;
      if (mode === "specific" && Array.isArray(specific) && specific.length) allowed = specific as string[];
      if (mode === "all_except" && Array.isArray(except)) {
        const ex = except as string[];
        allowed = all.map((c) => c.code).filter((c) => !ex.includes(c));
      }
    }
    cacheLife("hours");
    const list = allowed ? all.filter((c) => allowed!.includes(c.code)) : all;
    return list.map((c) => ({ code: c.code, name: decode(c.name), states: c.states.map((s) => ({ code: s.code, name: decode(s.name) })) }));
  } catch (e) {
    console.error(e);
    cacheLife("seconds");
    return [];
  }
}

/** Enabled payment methods with the titles set in WooCommerce. */
export async function getGateways(): Promise<Gateway[]> {
  "use cache";
  cacheTag("settings");
  try {
    const res = await adminGet("/payment_gateways");
    if (!res.ok) throw new Error(`gateways ${res.status}`);
    const list = (await res.json()) as { id: string; title: string; description: string; enabled: boolean }[];
    cacheLife("hours");
    return list.filter((g) => g.enabled).map((g) => ({ id: g.id, title: decode(g.title), description: strip(g.description) }));
  } catch (e) {
    console.error(e);
    cacheLife("seconds");
    return [];
  }
}

function decode(s: string) {
  return s.replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d))).replace(/&amp;/g, "&").replace(/&#039;/g, "'");
}
function strip(s: string) {
  return decode(s.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

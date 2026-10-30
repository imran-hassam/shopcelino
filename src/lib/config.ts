// Site-wide settings. Category slugs here must exist in WooCommerce.
// Edit these lists to change the menu without touching page code.

export const SITE = {
  name: "Shop Celino",
  // Tagline taken from the live WordPress site.
  tagline: "Effortless pieces for every chapter of your day.",
  /** Short description used in search results and social previews. */
  description:
    "Shop women's dresses, lingerie, sleepwear, tops and sweaters at Shop Celino. New styles added often, with sale prices every day.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://shopcelino.com",
  /** Default image for social previews: the homepage hero photo (a real Shop Celino product photo). */
  shareImage: "https://shopcelino.com/wp-content/uploads/2026/09/CEWM0163.jpg",
};

/**
 * WOMEN'S-ONLY STOREFRONT
 * The store sells women's fashion only. A product is shown anywhere on the site
 * (listings, search, menus, sitemap, product pages) only if it belongs to at least one
 * of these WooCommerce categories. Everything else (men's, kids', demo items) stays in
 * WooCommerce untouched but is not shown. To show a product, give it one of these categories.
 */
export const WOMEN_CATEGORY_SLUGS = [
  "womens-dresses", "dresses", "womens-lingerie", "women-sleepwear", "women-apparel",
  "womens-blouses", "womens-shirts", "women-sweaters", "women-sports-bra",
  "babydolls-chemises", "teddies-bodysuits", "teddies-bodysuits-sale", "bra-panty-sets",
  "bra-and-panty-sets-deals", "corsets-bustiers",
  "best-seller-women-lingerie", "best-seller-women-apperal", "best-sellers-womens-apparel",
  "new-arrival-women-lingerie", "new-arrival-womens-apparel",
];

/**
 * Store-wide collections ("Best Sellers", "New Arrivals") mix in men's items in WooCommerce,
 * so the storefront uses their women's-only versions instead. Same URL (/shop?category=best-seller).
 */
export const WOMEN_COLLECTIONS: Record<string, { label: string; slugs: string[] }> = {
  "best-seller": { label: "Best Sellers", slugs: ["best-seller-women-lingerie", "best-seller-women-apperal", "best-sellers-womens-apparel"] },
  "new-arrival": { label: "New Arrivals", slugs: ["new-arrival-women-lingerie", "new-arrival-womens-apparel"] },
};

/** Friendlier names for WooCommerce categories whose names read awkwardly on the site. */
export const CATEGORY_LABELS: Record<string, string> = {
  "womens-dresses": "Dresses",
  dresses: "Dresses",
  "womens-lingerie": "Lingerie",
  "women-sleepwear": "Sleepwear",
  "women-apparel": "Clothing",
  "womens-blouses": "Blouses & Tops",
  "womens-shirts": "Shirts",
  "women-sweaters": "Sweaters",
  "women-sports-bra": "Sports Bras",
  "babydolls-chemises": "Babydolls & Chemises",
  "teddies-bodysuits": "Teddies & Bodysuits",
  "teddies-bodysuits-sale": "Teddies & Bodysuits Sale",
  "bra-panty-sets": "Bra & Panty Sets",
  "bra-and-panty-sets-deals": "Bra & Panty Set Deals",
  "corsets-bustiers": "Corsets & Bustiers",
  "best-seller-women-lingerie": "Best-Selling Lingerie",
  "best-seller-women-apperal": "Best-Selling Clothing",
  "best-sellers-womens-apparel": "Best-Selling Clothing",
  "new-arrival-women-lingerie": "New Lingerie",
  "new-arrival-womens-apparel": "New Clothing",
  "best-seller": "Best Sellers",
  "new-arrival": "New Arrivals",
};

/** Shop dropdown, Today's Sales "Shop by" circles, home category strip and footer "Shop" column. */
export const MENU_CATEGORIES: { slug: string; label: string }[] = [
  { slug: "womens-dresses", label: "Dresses" },
  { slug: "womens-lingerie", label: "Lingerie" },
  { slug: "women-sleepwear", label: "Sleepwear" },
  { slug: "womens-blouses", label: "Blouses & Tops" },
  { slug: "women-sweaters", label: "Sweaters" },
  { slug: "babydolls-chemises", label: "Babydolls & Chemises" },
  { slug: "teddies-bodysuits", label: "Teddies & Bodysuits" },
  { slug: "bra-panty-sets", label: "Bra & Panty Sets" },
];

/** SHOP mega menu "Collections" column (women's categories or women's collections, shown if they have products). */
export const MEGA_COLLECTIONS = ["new-arrival", "best-seller", "corsets-bustiers", "women-apparel", "women-sports-bra", "bra-and-panty-sets-deals"];

/** Home page "Best Sellers / New Arrivals" tabs (women's collections above). */
export const HOME_TABS = [
  { slug: "best-seller", label: "Best Sellers" },
  { slug: "new-arrival", label: "New Arrivals" },
];

/** Home page "Choose Your Look" — three collection cards. */
export const HOME_LOOKS = [
  { slug: "womens-dresses", title: "Dresses for Every Occasion" },
  { slug: "womens-lingerie", title: "Lingerie & Intimates" },
  { slug: "women-sleepwear", title: "Comfortable Sleepwear" },
];

export function isWomenCategory(slug: string) {
  return WOMEN_CATEGORY_SLUGS.includes(slug);
}
/** Categories and collections a shopper can browse at /shop?category=… */
export function isShopCategory(slug: string) {
  return isWomenCategory(slug) || slug in WOMEN_COLLECTIONS;
}
export function categoryLabel(slug: string, wpName: string) {
  return CATEGORY_LABELS[slug] ?? wpName;
}

/**
 * Leftover demo categories in WooCommerce that don't belong in a fashion store.
 * Products in these are hidden from listings and the filter sidebar.
 */
export const HIDDEN_CATEGORY_SLUGS = [
  "uncategorized",
  "laptops-tablets-pcs", "laptops", "apple-macbook", "business-laptop", "gaming-laptop", "ultrabook",
  "pcs", "all-in-one", "gaming-pcs", "office-pcs",
  "tablets", "android-tablets", "apple-ipad", "windows-tablets",
  "smartphones", "smartphons", "car-holders", "covers-for-phones", "data-cables",
  "mains-chargers", "memory-cards", "power-banks", "stand-holders", "wireless-chargers",
];

/** Categories offered in the shop's "Filter by" list (women's only, no duplicate merchandising lists). */
export const FILTER_CATEGORY_SLUGS = [
  "womens-dresses", "womens-lingerie", "women-sleepwear", "women-apparel", "womens-blouses", "womens-shirts",
  "women-sweaters", "women-sports-bra", "babydolls-chemises", "teddies-bodysuits", "bra-panty-sets", "corsets-bustiers",
];

export const PAGE_SIZE = 12;

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
 * WHAT THE SHOP SHOWS
 * Every PUBLISHED WooCommerce product (the Store API never returns drafts, private or trashed
 * products). Categories appear wherever they contain at least one published product — see
 * getActiveCategories() in lib/woo.ts. To hide a product, set it to Draft in WordPress.
 */

/**
 * Store-wide lists that every product sits in. They are kept out of breadcrumbs/"related products"
 * (a product's own category is more useful there) but still listed and browsable like any category.
 */
export const GENERIC_CATEGORY_SLUGS = [
  "shop", "best-seller", "best-selling-products", "new-products", "new-arrival", "winter-items",
  "limited-pieces-4", "limited-pieces", "featured",
];

/** Friendlier names for WooCommerce categories whose names read awkwardly on the site. */
export const CATEGORY_LABELS: Record<string, string> = {
  "womens-dresses": "Women's Dresses",
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
  "best-sellers-womens-apparel": "Best-Selling Apparel",
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

/** SHOP mega menu "Collections" column (WooCommerce categories, shown only while they have published products). */
export const MEGA_COLLECTIONS = ["new-arrival", "best-seller", "corsets-bustiers", "women-apparel", "women-sports-bra", "bra-and-panty-sets-deals"];

/** Home page "Best Sellers / New Arrivals" tabs (WooCommerce categories). */
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

export function categoryLabel(slug: string, wpName: string) {
  return CATEGORY_LABELS[slug] ?? wpName;
}

export const PAGE_SIZE = 12;

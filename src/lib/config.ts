// Site-wide settings. Category slugs here must exist in WooCommerce.
// Edit these lists to change the menu without touching page code.

export const SITE = {
  name: "Shop Celino",
  // Tagline taken from the live WordPress site.
  tagline: "Effortless pieces for every chapter of your day.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://shopcelino.com",
};

/** Shop dropdown + footer "Shop" column. */
export const MENU_CATEGORIES: { slug: string; label: string }[] = [
  { slug: "womens-dresses", label: "Women's Dresses" },
  { slug: "womens-lingerie", label: "Women's Lingerie" },
  { slug: "women-sleepwear", label: "Women's Sleepwear" },
  { slug: "women-apparel", label: "Women's Apparel" },
  { slug: "mens-formal-wear", label: "Men's Formal Wear" },
  { slug: "mens-street-wear", label: "Men's Streetwear" },
  { slug: "ties", label: "Ties & Accessories" },
  { slug: "kids", label: "Kids" },
];

/** SHOP mega menu "Collections" column (WooCommerce category slugs, shown if they have products). */
export const MEGA_COLLECTIONS = ["new-arrival", "best-seller", "featured", "limited-pieces", "sleepwear-sale", "t-shirt-sale"];

/** Home page "Best Sellers / New Arrivals" tabs. */
export const HOME_TABS = [
  { slug: "best-seller", label: "Best Sellers" },
  { slug: "new-arrival", label: "New Arrivals" },
];

/** Home page "Choose Your Look" — three collection cards. */
export const HOME_LOOKS = [
  { slug: "womens-dresses", title: "Dresses for Every Occasion" },
  { slug: "womens-lingerie", title: "Lingerie & Intimates" },
  { slug: "mens-formal-wear", title: "Men's Tailoring" },
];

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

/**
 * Merchandising/duplicate categories that hold products but shouldn't appear
 * as browsable filters (they mirror the real categories).
 */
export const NON_FILTER_CATEGORY_SLUGS = [
  "best-seller", "best-selling-products", "new-products", "new-arrival", "shop",
  "limited-pieces-4", "winter-items", "mens-streetwear", "featured",
];

export const PAGE_SIZE = 12;

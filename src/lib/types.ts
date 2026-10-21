// Shapes returned by the WooCommerce Store API (wc/store/v1). Only the fields we use.

export type WCImage = {
  id: number;
  src: string;
  thumbnail: string;
  srcset: string;
  sizes: string;
  thumbnail_srcset?: string;
  thumbnail_sizes?: string;
  name: string;
  alt: string;
};

export type WCPrices = {
  price: string;
  regular_price: string;
  sale_price: string;
  price_range: { min_amount: string; max_amount: string } | null;
  currency_code: string;
  currency_symbol: string;
  currency_minor_unit: number;
  currency_decimal_separator: string;
  currency_thousand_separator: string;
  currency_prefix: string;
  currency_suffix: string;
};

export type WCTermRef = { id: number; name: string; slug: string; link?: string };

export type WCAttribute = {
  id: number;
  name: string;
  taxonomy: string | null;
  has_variations: boolean;
  terms: { id: number; name: string; slug: string; default?: boolean }[];
};

export type WCVariationRef = {
  id: number;
  attributes: { name: string; value: string }[];
};

export type WCProduct = {
  id: number;
  name: string;
  slug: string;
  parent: number;
  type: string;
  permalink: string;
  sku: string;
  short_description: string;
  description: string;
  on_sale: boolean;
  prices: WCPrices;
  average_rating: string;
  review_count: number;
  images: WCImage[];
  categories: WCTermRef[];
  tags: WCTermRef[];
  attributes: WCAttribute[];
  variations: WCVariationRef[];
  is_purchasable: boolean;
  is_in_stock: boolean;
  low_stock_remaining: number | null;
  sold_individually: boolean;
  add_to_cart: { minimum: number; maximum: number; multiple_of: number };
};

export type WCCategory = {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count: number;
  description: string;
  image: WCImage | null;
};

export type ProductList = {
  products: WCProduct[];
  total: number;
  totalPages: number;
};

// ---- Cart ----

export type WCCartItem = {
  key: string;
  id: number;
  quantity: number;
  name: string;
  sku: string;
  permalink: string;
  images: WCImage[];
  variation: { attribute: string; value: string }[];
  prices: WCPrices;
  totals: {
    line_subtotal: string;
    line_total: string;
    currency_minor_unit: number;
    currency_prefix: string;
    currency_suffix: string;
  };
  quantity_limits: { minimum: number; maximum: number; multiple_of: number };
};

export type WCShippingRate = {
  rate_id: string;
  name: string;
  description: string;
  delivery_time: string;
  price: string;
  selected: boolean;
  currency_minor_unit: number;
  currency_prefix: string;
  currency_suffix: string;
};

export type WCAddress = {
  first_name: string;
  last_name: string;
  company: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  phone: string;
  email?: string;
};

export type WCCart = {
  items: WCCartItem[];
  items_count: number;
  coupons: { code: string; totals: { total_discount: string } }[];
  needs_shipping: boolean;
  needs_payment: boolean;
  has_calculated_shipping: boolean;
  shipping_rates: { package_id: number; name: string; shipping_rates: WCShippingRate[] }[];
  shipping_address: WCAddress;
  billing_address: WCAddress;
  payment_methods: string[];
  errors: { code: string; message: string }[];
  totals: {
    total_items: string;
    total_discount: string;
    total_shipping: string | null;
    total_tax: string;
    total_price: string;
    currency_code: string;
    currency_symbol: string;
    currency_minor_unit: number;
    currency_prefix: string;
    currency_suffix: string;
  };
};

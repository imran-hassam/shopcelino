const wp = (process.env.WORDPRESS_URL ?? "https://shopcelino.com").replace(/\/+$/, "");
/** The client's own logo from their WordPress media library. */
export const LOGO_URL = `${wp}/wp-content/uploads/2026/10/LOGO.png`;
/** Customer accounts live in WooCommerce. */
export const ACCOUNT_URL = `${wp}/my-account/`;

import localFont from "next/font/local";

// Self-hosted (bundled from npm) so no request goes to Google at runtime.
export const display = localFont({
  src: "../../node_modules/@fontsource/marcellus/files/marcellus-latin-400-normal.woff2",
  weight: "400",
  variable: "--font-marcellus",
  display: "swap",
});

export const sans = localFont({
  src: "../../node_modules/@fontsource-variable/open-sans/files/open-sans-latin-wght-normal.woff2",
  weight: "300 800",
  variable: "--font-opensans",
  display: "swap",
});

import type { Metadata, Viewport } from "next";
import { StoreProvider } from "@/components/StoreProvider";
import { SITE } from "@/lib/config";
import { LOGO_URL } from "@/lib/site-urls";
import { display, sans } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} | Women's Dresses, Lingerie & Sleepwear`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  // Browser tab icon: the Shop Celino logo from the WordPress media library.
  icons: { icon: LOGO_URL, shortcut: LOGO_URL, apple: LOGO_URL },
  openGraph: {
    siteName: SITE.name,
    type: "website",
    locale: "en_US",
    title: `${SITE.name} | Women's Dresses, Lingerie & Sleepwear`,
    description: SITE.description,
    images: [{ url: SITE.shareImage, alt: "Model wearing a yellow off-the-shoulder blouse from Shop Celino" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} | Women's Dresses, Lingerie & Sleepwear`,
    description: SITE.description,
    images: [SITE.shareImage],
  },
  // Keep the preview out of Google until the domain switch is approved.
  robots: { index: process.env.ALLOW_INDEXING === "true", follow: process.env.ALLOW_INDEXING === "true" },
};

export const viewport: Viewport = { themeColor: "#FAF8F2" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <StoreProvider>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded focus:bg-white focus:px-4 focus:py-2">
            Skip to content
          </a>
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}

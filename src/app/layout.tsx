import type { Metadata, Viewport } from "next";
import { StoreProvider } from "@/components/StoreProvider";
import { SITE } from "@/lib/config";
import { display, sans } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} — Women's, Men's & Kids' Fashion`, template: `%s | ${SITE.name}` },
  description: SITE.tagline,
  openGraph: { siteName: SITE.name, type: "website" },
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

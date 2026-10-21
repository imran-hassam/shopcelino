import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://shopcelino.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Shop Celino", template: "%s | Shop Celino" },
  description: "Shop Celino — online store.",
  robots: { index: false, follow: false }, // flip to true at launch
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

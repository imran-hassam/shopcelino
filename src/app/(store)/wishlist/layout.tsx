import type { Metadata } from "next";

// Personal page: not useful in search results.
export const metadata: Metadata = { title: "Your Wishlist", robots: { index: false, follow: true } };

export default function Layout({ children }: LayoutProps<"/wishlist">) {
  return children;
}

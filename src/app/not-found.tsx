import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="flex flex-1 flex-col items-center justify-center px-5 py-28 text-center">
      <p className="font-display text-7xl text-primary">404</p>
      <h1 className="mt-4 text-[36px]">Page not found</h1>
      <p className="mt-3 text-muted">The page you&apos;re looking for has moved or no longer exists.</p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="rounded-full bg-heading px-7 py-3 font-semibold text-white">Go home</Link>
        <Link href="/shop" className="rounded-full border border-heading px-7 py-3 font-semibold">Shop all</Link>
      </div>
    </main>
  );
}

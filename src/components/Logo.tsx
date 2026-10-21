/* eslint-disable @next/next/no-img-element */
// The client's own logo, served from their WordPress media library.
export function Logo({ src, className = "" }: { src: string; className?: string }) {
  return <img src={src} alt="Shop Celino" className={`w-auto object-contain ${className}`} />;
}

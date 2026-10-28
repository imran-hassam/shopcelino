import Link from "next/link";
import { ChevronRight, House } from "lucide-react";

export type Crumb = { label: string; href?: string };

/**
 * Inner-page banner (design taken from the About Us page): title on the left,
 * breadcrumb underneath. "Home" is always the first crumb; the last crumb is
 * the current page.
 */
export function PageHero({
  title,
  crumbs,
  description,
  aside,
  clampTitle = false,
}: {
  title: string;
  /** Limit very long titles (e.g. product names) to two lines. */
  clampTitle?: boolean;
  /** Crumbs after "Home". The last one is the current page and is not linked. */
  crumbs: Crumb[];
  description?: string;
  /** Optional content on the right (e.g. Previous / Next links). */
  aside?: React.ReactNode;
}) {
  return (
    <header className="mx-auto max-w-[1440px] px-4 pt-6 md:px-8 md:pt-8">
      <div className="glass-card relative isolate flex flex-col gap-5 overflow-hidden rounded-3xl px-6 py-10 md:px-10 md:py-14 lg:flex-row lg:items-end lg:justify-between">
        {/* Soft brand-gold light inside the glass banner */}
        <span aria-hidden className="pointer-events-none absolute -right-24 -top-24 -z-10 size-72 rounded-full bg-secondary/60 blur-3xl" />
        <div className="min-w-0">
          <h1 className={`break-words text-[40px] leading-tight md:text-[52px] ${clampTitle ? "line-clamp-2" : ""}`} title={clampTitle ? title : undefined}>
            {title}
          </h1>
          <Breadcrumbs crumbs={crumbs} />
          {description && <p className="mt-4 max-w-2xl text-[16px] text-foreground/75">{description}</p>}
        </div>
        {aside && <div className="shrink-0 text-[15px]">{aside}</div>}
      </div>
    </header>
  );
}

function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mt-3">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px]">
        <li>
          <Link href="/" className="flex items-center gap-1.5 text-muted hover:text-primary-hover">
            <House className="size-4" strokeWidth={1.5} /> Home
          </Link>
        </li>
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-2">
              <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
              {last || !c.href ? (
                <span aria-current={last ? "page" : undefined} className={last ? "line-clamp-1 break-words" : "text-muted"}>
                  {c.label}
                </span>
              ) : (
                <Link href={c.href} className="text-muted hover:text-primary-hover">
                  {c.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Same size as PageHero, shown while a page's title is loading (prevents layout shift). */
export function PageHeroSkeleton() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 pt-6 md:px-8 md:pt-8" aria-hidden>
      <div className="glass-card animate-pulse rounded-3xl px-6 py-10 md:px-10 md:py-14">
        <div className="h-[50px] w-64 rounded-lg bg-white/70 md:h-[65px] md:w-96" />
        <div className="mt-3 h-[22px] w-48 rounded-lg bg-white/70" />
      </div>
    </div>
  );
}

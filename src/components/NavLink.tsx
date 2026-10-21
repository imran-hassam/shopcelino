"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

type Props = { href: string; className?: string; activeClassName?: string; children: React.ReactNode };

function Active({ href, className = "", activeClassName = "", children }: Props) {
  const pathname = usePathname();
  const on = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link href={href} className={`${className} ${on ? activeClassName : ""}`} aria-current={on ? "page" : undefined}>
      {children}
    </Link>
  );
}

/** A link that highlights itself on the current page. */
export function NavLink(props: Props) {
  return (
    <Suspense
      fallback={
        <Link href={props.href} className={props.className}>
          {props.children}
        </Link>
      }
    >
      <Active {...props} />
    </Suspense>
  );
}

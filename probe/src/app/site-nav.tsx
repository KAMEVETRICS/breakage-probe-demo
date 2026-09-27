"use client";

import Link from "next/link";
import { hrefWithFixes } from "../fixes";
import { useFixes } from "./use-fixes";

export function SiteNav() {
  const { fixes } = useFixes();

  return (
    <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Main">
      <Link href={hrefWithFixes("/", fixes)} className="inline-flex min-h-11 items-center">
        Dashboard
      </Link>
      <Link href={hrefWithFixes("/demo", fixes)} className="inline-flex min-h-11 items-center">
        Demo app
      </Link>
    </nav>
  );
}

"use client";

import Link from "next/link";
import { hrefWithFixes } from "../fixes";
import { useFixes } from "./use-fixes";

export function FixLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { fixes } = useFixes();
  return (
    <Link href={hrefWithFixes(href, fixes)} className={className}>
      {children}
    </Link>
  );
}

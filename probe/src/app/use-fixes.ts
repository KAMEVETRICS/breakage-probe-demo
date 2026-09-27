"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type FixId, hrefWithFixes, parseFixes } from "../fixes";

export function useFixes() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const fixes = parseFixes(params.get("fixes"));

  function toggle(id: FixId) {
    const next = fixes.includes(id) ? fixes.filter((item) => item !== id) : [...fixes, id];
    router.replace(hrefWithFixes(pathname, next), { scroll: false });
  }

  return { fixes, toggle };
}

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const LINK_CAP = 6;
const BODY_CAP = 100_000;

export type PageNote = {
  url: string;
  status: number;
  title: string;
  snippet: string;
};

export type ResearchReport = {
  main: PageNote;
  linked: PageNote[];
  skipped: string[];
};

export async function allowedTarget(target: URL, ownHost: string) {
  if (target.protocol !== "http:" && target.protocol !== "https:") return false;
  if (target.host === ownHost) return true;
  const ownName = ownHost.replace(/:\d+$/, "").replace(/^\[|\]$/g, "");
  if (loopback(target.hostname) && loopback(ownName)) return true;
  if (privateHost(target.hostname)) return false;
  // A public-looking name can still point at a private address, so check what it resolves to.
  const name = target.hostname.replace(/^\[|\]$/g, "");
  if (isIP(name)) return true;
  try {
    const addresses = await lookup(name, { all: true });
    return addresses.length > 0 && addresses.every((entry) => !privateHost(entry.address));
  } catch {
    return false;
  }
}

export function linksOnPage(html: string, pageUrl: string) {
  const base = new URL(pageUrl);
  const follow: string[] = [];
  const skipped: string[] = [];
  const seen = new Set<string>([pageKey(base)]);

  for (const href of hrefs(html)) {
    let url: URL;
    try {
      url = new URL(href, base);
    } catch {
      continue;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") continue;
    url.hash = "";
    const key = pageKey(url);
    if (seen.has(key)) continue;
    seen.add(key);
    if (url.host !== base.host) {
      if (skipped.length < LINK_CAP) skipped.push(url.origin + url.pathname);
      continue;
    }
    if (follow.length >= LINK_CAP) continue;
    follow.push(key);
  }

  return { follow, skipped };
}

export function pageNote(url: string, status: number, html: string): PageNote {
  return {
    url,
    status,
    title: titleOf(html),
    snippet: snippetOf(html),
  };
}

export async function readResearch(pageUrl: string): Promise<ResearchReport> {
  const start = new URL(pageUrl);
  const mainRead = await fetchPage(pageUrl);
  const mainAway = offHostLocation(mainRead.location, start);
  if (mainAway) {
    return {
      main: pageNote(pageUrl, mainRead.status, ""),
      linked: [],
      skipped: [mainAway],
    };
  }

  const { follow, skipped } = linksOnPage(mainRead.html, pageUrl);
  const reads = await Promise.all(follow.map(async (url) => ({ url, read: await fetchPage(url) })));
  const linked: PageNote[] = [];
  for (const item of reads) {
    const away = offHostLocation(item.read.location, start);
    if (away) {
      if (skipped.length < LINK_CAP) skipped.push(away);
      continue;
    }
    linked.push(pageNote(item.url, item.read.status, item.read.html));
  }

  return {
    main: pageNote(pageUrl, mainRead.status, mainRead.html),
    linked,
    skipped,
  };
}

function offHostLocation(location: string | null, start: URL) {
  if (!location) return null;
  try {
    const next = new URL(location, start);
    if (next.host !== start.host) return pageKey(next);
  } catch {
    return null;
  }
  return null;
}

function pageKey(url: URL) {
  return url.origin + url.pathname + url.search;
}

function hrefs(html: string) {
  const found: string[] = [];
  const pattern = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi;
  for (const match of html.matchAll(pattern)) found.push(match[1]);
  return found;
}

function loopback(hostname: string) {
  const host = hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function privateHost(hostname: string) {
  let host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (host.includes(":")) {
    const mapped = mappedIPv4(host);
    if (!mapped) return privateIPv6(host);
    host = mapped;
  }
  if (host === "0.0.0.0" || host === "169.254.169.254") return true;
  const parts = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(host);
  if (!parts) return false;
  const a = Number(parts[1]);
  const b = Number(parts[2]);
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

function privateIPv6(host: string) {
  if (host === "::" || host === "::1") return true;
  const first = parseInt(host.split(":")[0] || "0", 16);
  if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((first & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  return false;
}

// ::ffff:a.b.c.d or ::ffff:7f00:1 -> "a.b.c.d"
function mappedIPv4(host: string) {
  const dotted = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(host);
  if (dotted) return dotted[1];
  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(host);
  if (!hex) return null;
  const high = parseInt(hex[1], 16);
  const low = parseInt(hex[2], 16);
  return [high >> 8, high & 255, low >> 8, low & 255].join(".");
}

async function fetchPage(url: string) {
  const response = await fetch(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(8000),
    headers: { accept: "text/html" },
  });
  const location = response.headers.get("location");
  if (response.status >= 300 && response.status < 400) {
    return { status: response.status, html: "", location };
  }
  const html = (await response.text()).slice(0, BODY_CAP);
  return { status: response.status, html, location: null };
}

function titleOf(html: string) {
  const match = /<title[^>]*>([^<]*)<\/title>/i.exec(html);
  return match ? decode(match[1]).trim() : "";
}

function snippetOf(html: string) {
  const text = decode(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 240);
}

function decode(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

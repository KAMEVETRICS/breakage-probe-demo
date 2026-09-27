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

export function allowedTarget(target: URL, ownHost: string) {
  if (target.protocol !== "http:" && target.protocol !== "https:") return false;
  if (target.host === ownHost) return true;
  const ownName = ownHost.replace(/:\d+$/, "").replace(/^\[|\]$/g, "");
  if (loopback(target.hostname) && loopback(ownName)) return true;
  return !privateHost(target.hostname);
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
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (host === "0.0.0.0" || host === "::1" || host === "169.254.169.254") return true;
  const parts = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(host);
  if (!parts) return false;
  const a = Number(parts[1]);
  const b = Number(parts[2]);
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
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

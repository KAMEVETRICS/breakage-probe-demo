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
  const mainRead = await fetchPage(pageUrl);
  const final = new URL(mainRead.finalUrl);
  const start = new URL(pageUrl);
  if (final.host !== start.host) {
    return {
      main: pageNote(mainRead.finalUrl, mainRead.status, ""),
      linked: [],
      skipped: ["Redirect left the host you sent"],
    };
  }

  const { follow, skipped } = linksOnPage(mainRead.html, mainRead.finalUrl);
  const linked = await Promise.all(
    follow.map(async (url) => {
      const read = await fetchPage(url);
      const landed = new URL(read.finalUrl);
      if (landed.host !== start.host) {
        return pageNote(read.finalUrl, read.status, "");
      }
      return pageNote(read.finalUrl, read.status, read.html);
    }),
  );

  return {
    main: pageNote(mainRead.finalUrl, mainRead.status, mainRead.html),
    linked,
    skipped,
  };
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
    redirect: "follow",
    signal: AbortSignal.timeout(8000),
    headers: { accept: "text/html" },
  });
  const html = (await response.text()).slice(0, BODY_CAP);
  return { finalUrl: response.url, status: response.status, html };
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

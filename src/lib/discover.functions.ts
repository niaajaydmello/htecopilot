import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** How far the crawler walks from the pasted page. */
export type DiscoveryDepth = "page" | "level" | "site";

const DEPTH_LIMITS: Record<DiscoveryDepth, { hops: number; maxPages: number }> = {
  page: { hops: 0, maxPages: 1 },
  level: { hops: 1, maxPages: 12 },
  site: { hops: 3, maxPages: 40 },
};

const MAX_PDFS = 200;
const FETCH_TIMEOUT = 20_000;

function isPdfUrl(u: string) {
  return /\.pdf(\?|#|$)/i.test(u);
}

function normalise(href: string, base: string): string | null {
  try {
    const u = new URL(href, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

type Anchor = { url: string; text: string };

function parseAnchors(html: string, base: string): Anchor[] {
  const out: Anchor[] = [];
  const re = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const url = normalise(decodeEntities(m[1]!), base);
    if (!url) continue;
    const text = decodeEntities(m[2]!.replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim();
    out.push({ url, text });
  }
  return out;
}

async function fetchText(url: string): Promise<{ html: string; finalUrl: string } | null> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; HTE-Copilot/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("html") && !type.includes("xml")) return null;
    return { html: await res.text(), finalUrl: res.url || url };
  } catch {
    return null;
  }
}

function titleFrom(anchorText: string, url: string) {
  if (anchorText && anchorText.length > 3) return anchorText.slice(0, 180);
  try {
    const name = decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "");
    return name.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ") || url;
  } catch {
    return url;
  }
}

/** Crawl a page (and optionally its links) and list every PDF found. */
export const discoverPdfs = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        url: z.string().min(4).max(2000),
        depth: z.enum(["page", "level", "site"]).default("page"),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const start = normalise(data.url.trim(), "https://example.com");
    if (!start || !/^https?:\/\//i.test(data.url.trim().startsWith("http") ? data.url.trim() : `https://${data.url.trim()}`)) {
      // fall through — normalise already validated protocol
    }
    const seed = normalise(
      data.url.trim().startsWith("http") ? data.url.trim() : `https://${data.url.trim()}`,
      "https://example.com",
    );
    if (!seed) throw new Error("That does not look like a valid website link.");

    const origin = new URL(seed).origin;
    const { hops, maxPages } = DEPTH_LIMITS[data.depth];

    const queue: { url: string; depth: number }[] = [{ url: seed, depth: 0 }];
    const visited = new Set<string>();
    const pdfs = new Map<string, { url: string; title: string; sourcePage: string }>();
    let pagesCrawled = 0;
    let pagesFailed = 0;

    while (queue.length > 0 && pagesCrawled < maxPages && pdfs.size < MAX_PDFS) {
      const item = queue.shift()!;
      if (visited.has(item.url)) continue;
      visited.add(item.url);

      const page = await fetchText(item.url);
      if (!page) {
        pagesFailed += 1;
        continue;
      }
      pagesCrawled += 1;

      for (const a of parseAnchors(page.html, page.finalUrl)) {
        if (isPdfUrl(a.url)) {
          if (!pdfs.has(a.url) && pdfs.size < MAX_PDFS) {
            pdfs.set(a.url, {
              url: a.url,
              title: titleFrom(a.text, a.url),
              sourcePage: page.finalUrl,
            });
          }
        } else if (item.depth < hops && a.url.startsWith(origin) && !visited.has(a.url)) {
          queue.push({ url: a.url, depth: item.depth + 1 });
        }
      }
    }

    return {
      seed,
      depth: data.depth,
      pagesCrawled,
      pagesFailed,
      truncated: pdfs.size >= MAX_PDFS || (queue.length > 0 && pagesCrawled >= maxPages),
      pdfs: Array.from(pdfs.values()),
    };
  });

/** Download a discovered PDF server-side (avoids browser CORS) and return it base64-encoded. */
export const fetchRemotePdf = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ url: z.string().url().max(2000) }).parse(d))
  .handler(async ({ data }) => {
    const res = await fetch(data.url, {
      redirect: "follow",
      signal: AbortSignal.timeout(60_000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; HTE-Copilot/1.0)" },
    });
    if (!res.ok) throw new Error(`Download failed (${res.status}) for ${data.url}`);
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength === 0) throw new Error("Downloaded file was empty.");
    if (buf.byteLength > 25 * 1024 * 1024) throw new Error("PDF is larger than the 25 MB limit.");

    let binary = "";
    for (let i = 0; i < buf.length; i += 8192) {
      binary += String.fromCharCode(...buf.subarray(i, i + 8192));
    }
    const name = decodeURIComponent(new URL(data.url).pathname.split("/").pop() || "document.pdf");
    return {
      filename: name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`,
      base64: btoa(binary),
      bytes: buf.byteLength,
    };
  });

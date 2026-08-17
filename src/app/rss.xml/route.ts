import { SITE } from "@/lib/site";
import { listPages, type SeoPage } from "@/lib/seo-pages";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function escXml(s: string): string {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cdata(s: string): string {
  return String(s || "").replace(/]]>/g, "]]&gt;");
}

function rfc822(d: Date): string {
  return d.toUTCString();
}

function resolveBase(req: Request): string {
  const u = new URL(req.url);
  const xfHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = xfHost || req.headers.get("host") || u.host;
  const xfProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = xfProto || (u.protocol === "https:" ? "https" : "http");
  return `${proto}://${host}`.replace(/\/$/, "");
}

function fullBody(page: SeoPage): string {
  const parts: string[] = [];
  if (page.h1) parts.push(page.h1);
  if (page.heroSubtitle) parts.push(page.heroSubtitle);
  for (const sec of page.sections || []) {
    if (sec.h2) parts.push(sec.h2);
    for (const p of sec.paragraphs || []) parts.push(p);
  }
  for (const f of page.faqs || []) {
    if (f.q) parts.push(`Q. ${f.q}`);
    if (f.a) parts.push(`A. ${f.a}`);
  }
  const text = parts.filter(Boolean).join("\n\n");
  return text || page.metaDescription || page.title;
}

function itemXml(base: string, page: SeoPage): string {
  const link = `${base}/guide/${encodeURIComponent(page.slug)}`;
  const pub = new Date(page.updatedAt || page.createdAt || Date.now());
  const body = fullBody(page);
  const desc = page.metaDescription || body.slice(0, 300);

  return `  <item>
    <title>${escXml(page.title)}</title>
    <link>${escXml(link)}</link>
    <guid isPermaLink="true">${escXml(link)}</guid>
    <pubDate>${rfc822(pub)}</pubDate>
    <author>${escXml(SITE.brand)}</author>
    <category>${escXml(page.keyword || "정원인테리어")}</category>
    <description><![CDATA[${cdata(desc)}]]></description>
    <content:encoded><![CDATA[${cdata(body)}]]></content:encoded>
  </item>`;
}

export async function GET(req: Request) {
  const base = resolveBase(req);
  let pages = await listPages(50);

  if (!pages.length) {
    pages = [
      {
        slug: "purme-intro",
        keyword: "정원인테리어",
        title: `${SITE.name} | 정원·테라스 인테리어`,
        metaDescription: SITE.description,
        metaKeywords: SITE.keywords.join(", "),
        h1: `${SITE.name} 안내`,
        heroSubtitle: SITE.taglineEn,
        sections: [
          {
            h2: "조경인테리어 푸르메정원",
            paragraphs: [SITE.description, SITE.tagline],
          },
        ],
        faqs: [],
        images: [],
        ctaText: `${SITE.phone}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  const items = pages.slice(0, 50);
  const lastBuild = new Date(items[0]?.updatedAt || items[0]?.createdAt || Date.now());

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${escXml(SITE.name)}</title>
  <link>${escXml(base)}/</link>
  <description>${escXml(SITE.description)}</description>
  <language>ko</language>
  <copyright>${escXml(SITE.brand)}</copyright>
  <managingEditor>${escXml(`${SITE.phone} (${SITE.brand})`)}</managingEditor>
  <webMaster>${escXml(`${SITE.phone} (${SITE.brand})`)}</webMaster>
  <lastBuildDate>${rfc822(lastBuild)}</lastBuildDate>
  <ttl>60</ttl>
  <atom:link href="${escXml(`${base}/rss.xml`)}" rel="self" type="application/rss+xml" />
${items.map((p) => itemXml(base, p)).join("\n")}
</channel>
</rss>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

import type { MetadataRoute } from "next";
import { listPageSummaries } from "@/lib/seo-pages";
import { absoluteUrl, guidePageUrl } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = absoluteUrl("/");
  const pages = await listPageSummaries();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: base,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/guide"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  const guides = pages.map((p) => ({
    url: guidePageUrl(p.slug),
    lastModified: new Date(p.updatedAt || p.createdAt),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...guides];
}

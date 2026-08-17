import { extractRegionFromKeyword } from "./region-parse";
import { getSubRegionNames, normalizeCityKey } from "./sub-region-map";
import { getNearbyStationNames } from "./subway-map";
import { listPageSummaries } from "./seo-pages";

export interface NearbyLink {
  label: string;
  href: string | null;
}

function guideHref(slug: string) {
  return `/guide/${encodeURIComponent(slug)}`;
}

async function findPageHref(
  needle: string,
  cityLabel: string | null,
  currentSlug: string
): Promise<string | null> {
  const pages = await listPageSummaries();
  const match = pages.find((p) => {
    if (p.slug === currentSlug) return false;
    const compact = p.keyword.replace(/\s/g, "");
    return (
      compact.includes(needle) ||
      (cityLabel ? compact.includes(`${cityLabel}${needle}`) : false)
    );
  });
  return match ? guideHref(match.slug) : null;
}

/** SEO 페이지용 — 근방 지역(동·구) 링크 */
export async function getNearbySubRegionLinks(
  currentRegion: string | null,
  currentSlug: string
): Promise<{ cityLabel: string | null; regions: NearbyLink[] }> {
  const names = getSubRegionNames(currentRegion, 5);
  if (names.length === 0) {
    return { cityLabel: currentRegion, regions: [] };
  }
  const cityLabel = currentRegion ? normalizeCityKey(currentRegion) : null;
  const regions: NearbyLink[] = [];
  for (const area of names) {
    const href = await findPageHref(area, cityLabel, currentSlug);
    regions.push({ label: area, href });
  }
  return { cityLabel: currentRegion, regions };
}

/** SEO 페이지용 — 인근 지하철역 링크 */
export async function getNearbyStationLinks(
  currentRegion: string | null,
  currentSlug: string
): Promise<{ cityLabel: string | null; stations: NearbyLink[] }> {
  const names = getNearbyStationNames(currentRegion, 5);
  if (names.length === 0) {
    return { cityLabel: currentRegion, stations: [] };
  }
  const cityLabel = currentRegion ? normalizeCityKey(currentRegion) : null;
  const stations: NearbyLink[] = [];
  for (const station of names) {
    const bare = station.replace(/역$/u, "");
    const href =
      (await findPageHref(station, cityLabel, currentSlug)) ||
      (await findPageHref(bare, cityLabel, currentSlug));
    stations.push({ label: station, href });
  }
  return { cityLabel: currentRegion, stations };
}

export function regionFromPageKeyword(keyword: string): string | null {
  return extractRegionFromKeyword(keyword);
}

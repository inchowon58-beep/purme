import Link from "next/link";
import type { NearbyLink } from "@/lib/nearby-regions";

interface Props {
  cityLabel: string | null;
  stations: NearbyLink[];
  keywordSuffix?: string;
}

/** 인근 지하철역 — 지역 SEO 키워드 카드 */
export default function NearbyStationsSection({
  cityLabel,
  stations,
  keywordSuffix = "정원인테리어",
}: Props) {
  if (stations.length === 0 || !cityLabel) return null;

  return (
    <section className="mb-12 rounded-2xl border border-[var(--line)] bg-gradient-to-br from-[#f8efe8]/40 to-white p-6 shadow-[0_8px_24px_rgba(28,46,38,0.04)] sm:p-8">
      <p className="text-sm font-semibold text-[var(--coral-deep)]">인근 지하철역</p>
      <h2 className="mt-1 text-lg font-extrabold text-[var(--navy)] sm:text-xl">
        {cityLabel} 인근 지하철역 {keywordSuffix} 검색
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
        {cityLabel}에서 {keywordSuffix}을 찾을 때 방문 동선·환승을 고려해 함께 검색하는 인근 지하철역입니다.
      </p>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {stations.map((item) => {
          const title = `${item.label} ${keywordSuffix}`;
          const body = (
            <span className="block">
              <span className="block text-sm font-semibold text-[var(--navy)]">{title}</span>
              <span className="mt-0.5 block text-xs text-[var(--muted)]">
                {cityLabel} 인근 · {item.label}
              </span>
            </span>
          );
          return (
            <li key={item.label}>
              {item.href ? (
                <Link
                  href={item.href}
                  className="flex items-start gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-3.5 transition hover:border-[var(--coral)]"
                >
                  {body}
                </Link>
              ) : (
                <div className="flex items-start gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-3.5">
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p className="sr-only">
        {cityLabel} {keywordSuffix} 인근 지하철역:{" "}
        {stations.map((s) => `${s.label} ${keywordSuffix}`).join(", ")}
      </p>
    </section>
  );
}

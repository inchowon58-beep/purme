/** 조경인테리어 푸르메정원 — 사이트 공통 설정 */

const FALLBACK_ORIGIN = "https://www.purmegarden.co.kr";

/** 수집기(Yeti)가 200을 받는 최종 공개 주소. 끝 슬래시 없음, https·www 고정. */
export function publicOrigin(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || FALLBACK_ORIGIN).trim();
  try {
    const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
      return u.origin.replace(/\/$/, "");
    }
    if (
      u.hostname.endsWith(".vercel.app") ||
      u.hostname === "purmegarden.co.kr" ||
      u.hostname === "purme.vercel.app"
    ) {
      return FALLBACK_ORIGIN;
    }
    u.protocol = "https:";
    u.hash = "";
    u.search = "";
    u.pathname = "";
    return u.origin.replace(/\/$/, "");
  } catch {
    return FALLBACK_ORIGIN;
  }
}

export function absoluteUrl(path = "/"): string {
  const origin = publicOrigin();
  if (!path || path === "/") return origin;
  const p = (path.startsWith("/") ? path : `/${path}`).replace(/\/+$/, "");
  return `${origin}${p}`;
}

export function guidePageUrl(slug: string): string {
  return absoluteUrl(`/guide/${encodeURIComponent(slug)}`);
}

export const SITE = {
  name: "푸르메정원",
  brand: "푸르메정원",
  farm: "조경인테리어",
  tagline: "정원·테라스 인테리어, 신뢰로 완성합니다",
  taglineEn: "Purme Garden · Landscape & Terrace Interior",
  description:
    "푸르메정원은 정원인테리어와 테라스인테리어를 전문으로 하는 조경인테리어 업체입니다. 상담부터 설계·시공·마감까지 과정을 투명하게 안내하며, 오래 남을 공간을 책임지고 완성합니다. 문의 010-5606-9637.",
  keywords: [
    "정원인테리어",
    "테라스인테리어",
    "조경인테리어",
    "푸르메정원",
    "정원시공",
    "테라스시공",
    "조경설계",
    "옥상정원",
    "베란다인테리어",
    "정원조경",
    "데크시공",
    "외곽조경",
  ],
  phone: "010-5606-9637",
  phoneTel: "tel:01056069637",
  phoneDisplay: "010-5606-9637",
  logo: "https://image.cattery.co.kr/purme/01.webp",
  imageBase: "https://image.cattery.co.kr/purme",
  imageCount: 59,
  location: "대한민국 전국",
  address: "전국 상담 · 현장 방문 예약제",
  areaServed: "대한민국 전국",
  domain: "purme",
  get siteUrl() {
    return publicOrigin();
  },
  infocsUrl: "https://www.infocs.co.kr/",
} as const;

export const CTA_LABEL = "인테리어상담문의";
export const CTA_BUILD = "자동화사이트구축/렌탈문의";

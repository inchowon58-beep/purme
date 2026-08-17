/** 조경인테리어 푸르메정원 — 사이트 공통 설정 */

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
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://purme.vercel.app",
  infocsUrl: "https://www.infocs.co.kr/",
} as const;

export const CTA_LABEL = "인테리어상담문의";
export const CTA_BUILD = "자동화사이트구축/렌탈문의";

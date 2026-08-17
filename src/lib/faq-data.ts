import { SITE } from "./site";

export type FaqItem = { q: string; a: string };

/** 메인·AEO용 자주 묻는 질문 */
export const HOME_FAQS: FaqItem[] = [
  {
    q: "정원 인테리어는 어떻게 진행되나요?",
    a: `${SITE.name}는 전화 상담(${SITE.phone})으로 공간·예산·희망 분위기를 들은 뒤, 현장 실측과 설계안을 안내합니다. 확정 후 자재·식재·시공 일정까지 한 흐름으로 진행합니다.`,
  },
  {
    q: "테라스 인테리어도 가능한가요?",
    a: "네. 아파트·빌라 테라스부터 단독주택 데크까지 방수·배수·마감을 함께 검토합니다. 생활 동선과 관리 난이도를 먼저 맞춘 뒤 시공합니다.",
  },
  {
    q: "견적과 시공 과정을 투명하게 볼 수 있나요?",
    a: "상담 단계에서 범위·자재·일정·추가 비용을 숨기지 않고 설명합니다. 현장 진행 중에도 변경이 있으면 먼저 확인하고 진행합니다.",
  },
  {
    q: "전국에서 상담·시공이 가능한가요?",
    a: `전국 상담이 가능합니다. 현장 방문이 필요한 경우 일정을 조율해 실측 후 설계합니다. 문의 ${SITE.phone}.`,
  },
  {
    q: "시공 기간은 얼마나 걸리나요?",
    a: "공간 규모와 자재·식재 수급에 따라 달라집니다. 소규모 베란다·테라스는 짧게, 정원 전면 시공은 설계 확정 후 단계별로 안내드립니다.",
  },
  {
    q: "상담 전화번호는 어떻게 되나요?",
    a: `${SITE.phoneDisplay}입니다. 정원인테리어·테라스인테리어·조경 상담 모두 같은 번호로 안내받으실 수 있습니다.`,
  },
];

export function faqJsonLd(faqs: FaqItem[] = HOME_FAQS) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function orgJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    name: SITE.name,
    alternateName: [SITE.brand, SITE.farm, "조경인테리어 푸르메정원"],
    description: SITE.description,
    url: SITE.siteUrl,
    telephone: SITE.phone,
    image: SITE.logo,
    address: {
      "@type": "PostalAddress",
      addressCountry: "KR",
      streetAddress: SITE.address,
    },
    areaServed: SITE.areaServed,
    priceRange: "상담 후 견적",
    keywords: SITE.keywords.join(", "),
  };
}

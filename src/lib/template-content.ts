import { SITE } from "./site";
import { pickImages } from "./images";
import type { SeoPage } from "./seo-pages";
import { slugifyKeyword } from "./seo-pages";
import { extractKeywordTheme, extractRegionFromKeyword } from "./region-parse";
import { getSubRegionNames } from "./sub-region-map";
import { getNearbyStationNames } from "./subway-map";

const HERO = [
  "Garden & Terrace Interior · Trusted Craft",
  "Landscape Design with Honest Process",
  "From Consultation to Finished Garden",
  "Purme Garden · Spaces That Last",
];

const INTRO_H2 = [
  "{kw}, 왜 전문 시공이 필요할까요",
  "{kw} 알아보기 전 꼭 확인할 점",
  "신뢰 있는 선택을 위한 {kw} 안내",
  "{kw}와 푸르메정원의 시공 원칙",
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

export function generateTemplateContent(keyword: string, pageIndex = 1): SeoPage {
  const seed = hash(`${keyword}|${pageIndex}|${SITE.brand}`);
  const kw = keyword.trim() || "정원인테리어";
  const phone = SITE.phone;
  const brand = SITE.brand;
  const farm = SITE.farm;

  const title = `${kw} | ${farm} ${brand} 정원·테라스 시공`;
  const metaDescription = `${kw} 안내 — ${farm} ${brand}는 정원인테리어와 테라스인테리어를 책임 있게 상담·시공합니다. 투명한 견적, 현장 실측, 완공 후 관리 안내. 문의 ${phone}.`;
  const h1 = `${kw} — ${brand} 정원·테라스 인테리어`;

  const sections = [
    {
      h2: pick(INTRO_H2, seed).replace(/\{kw\}/g, kw),
      paragraphs: [
        `${kw}를 찾을 때 가장 중요한 것은 사진보다 실제 생활과 맞는 마감입니다. ${farm} ${brand}는 상담부터 설계·시공·관리 안내까지 한곳에서 진행합니다.`,
        `자재와 식재는 일조·배수·동선을 먼저 본 뒤 제안합니다. ${brand}는 과장된 효과보다 오래 쓸 수 있는 마감을 원칙으로 합니다.`,
        `상담은 전화(${phone})로 가능합니다. 공간 형태·예산·희망 분위기를 말씀해 주시면 실측과 시공 절차를 차분히 안내드립니다.`,
      ],
    },
    {
      h2: `${brand}가 ${kw}에서 지키는 약속`,
      paragraphs: [
        `투명한 견적, 현장 공유, 완공 후 관리 안내가 ${brand}의 기준입니다. 불필요한 시공보다 공간과 예산의 균형을 우선합니다.`,
        `${SITE.areaServed} 범위에서 상담이 가능하며, 현장 방문이 필요한 경우 실측 일정을 함께 조율합니다.`,
        `${kw}로 검색하신 분이라면, 범위·자재·일정을 먼저 확인하신 뒤 전화 상담을 권합니다. 문의 ${phone}.`,
      ],
    },
    {
      h2: `${kw} FAQ와 다음 단계`,
      paragraphs: [
        `${kw} 상담은 홈페이지 문의 또는 ${phone} 전화로 가능합니다. 정원인테리어·테라스인테리어 모두 같은 번호로 연결됩니다.`,
        `${brand}는 믿을 수 있는 과정과 오래 남을 풍경을 함께 만듭니다. 지금 바로 상담해 주세요.`,
      ],
    },
  ];

  const faqs = [
    {
      q: `${kw} 상담은 어떻게 하나요?`,
      a: `사이트 하단 문의 또는 ${phone} 전화로 접수합니다. 공간·예산·희망 일정을 알려주시면 ${brand}가 확인 후 안내합니다.`,
    },
    {
      q: `정원 인테리어와 테라스 인테리어 모두 가능한가요?`,
      a: `네. ${brand}는 정원·테라스·옥상·베란다 조경 인테리어를 함께 안내합니다. 현장 조건에 맞춰 설계와 시공 범위를 제안드립니다.`,
    },
    {
      q: `전국에서 이용할 수 있나요?`,
      a: `전국 상담이 가능합니다. 실측·시공이 필요한 경우 일정 조율 후 진행합니다. 문의 ${phone}.`,
    },
  ];

  const tweak = seed % 3;
  if (tweak === 1) {
    sections[0].paragraphs[0] = sections[0].paragraphs[0].replace("진행합니다", "함께합니다");
  } else if (tweak === 2) {
    sections[1].paragraphs[0] = sections[1].paragraphs[0].replace("기준입니다", "약속입니다");
  }

  const now = new Date().toISOString();
  const region = extractRegionFromKeyword(kw);
  const theme = extractKeywordTheme(kw);
  const areas = getSubRegionNames(region, 5);
  const stations = getNearbyStationNames(region, 5);
  const geoKw = [
    ...areas.map((a) => `${a} ${theme}`),
    ...stations.map((s) => `${s} ${theme}`),
  ].join(", ");
  let metaDescriptionFinal = metaDescription;
  if (areas.length || stations.length) {
    const nearBits = [...areas.slice(0, 3), ...stations.slice(0, 3)].slice(0, 4).join(" · ");
    metaDescriptionFinal = `${metaDescription} 근방·인근(${nearBits}) ${theme} 검색 안내.`;
  }
  return {
    slug: slugifyKeyword(kw, `t${pageIndex}${seed.toString(36).slice(0, 4)}`),
    keyword: kw,
    title,
    metaDescription: metaDescriptionFinal,
    metaKeywords: `${kw}, 정원인테리어, 테라스인테리어, 조경인테리어, 푸르메정원, 정원시공, 테라스시공, 조경설계${
      geoKw ? `, ${geoKw}` : ""
    }`,
    h1,
    heroSubtitle: pick(HERO, seed),
    heroBadge: "신뢰 시공",
    heroTitleLine1: kw,
    heroTitleLine2: "정원 · 테라스 인테리어",
    heroBar: "상담부터 완공까지 과정을 투명하게",
    sections,
    faqs,
    images: pickImages(3, seed),
    ctaText: `인테리어상담문의 ${phone} — ${brand}`,
    createdAt: now,
    updatedAt: now,
  };
}

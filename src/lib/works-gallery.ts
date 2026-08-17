import { imageUrl } from "./images";

export type WorkItem = {
  name: string;
  type: string;
  area: string;
  period: string;
  status: "시공 완료";
  traits: string[];
  src: string;
};

/** 대표 시공 유형 — 이미지 CDN 전 장을 갤러리에서 쓰고, 홈 카드는 유형별 대표컷 */
export const WORKS_GALLERY: WorkItem[] = [
  {
    name: "프라이빗 정원",
    type: "정원인테리어",
    area: "단독주택 마당",
    period: "현장 실측 후 시공",
    status: "시공 완료",
    traits: ["동선·식재를 함께 설계", "사계절 유지관리까지 안내"],
    src: imageUrl(2),
  },
  {
    name: "테라스 라운지",
    type: "테라스인테리어",
    area: "아파트·빌라 테라스",
    period: "방수·마감 포함",
    status: "시공 완료",
    traits: ["데크·조명·식재 일체 시공", "생활 동선에 맞춘 배치"],
    src: imageUrl(8),
  },
  {
    name: "옥상 정원",
    type: "옥상조경",
    area: "건물 옥상",
    period: "하중·배수 검토 후 진행",
    status: "시공 완료",
    traits: ["배수·방수 우선 설계", "바람·일조를 고려한 식재"],
    src: imageUrl(14),
  },
  {
    name: "베란다 정원",
    type: "베란다인테리어",
    area: "실내 확장 베란다",
    period: "소규모 당일~단기",
    status: "시공 완료",
    traits: ["협소 공간 맞춤 연출", "관리 쉬운 수종 제안"],
    src: imageUrl(20),
  },
  {
    name: "우드 데크",
    type: "데크시공",
    area: "마당·테라스",
    period: "기초 점검 후 시공",
    status: "시공 완료",
    traits: ["방부·난간·마감까지", "미끄럼·내구성 고려"],
    src: imageUrl(26),
  },
  {
    name: "식재·잔디",
    type: "조경식재",
    area: "정원 전면",
    period: "계절 일정 조율",
    status: "시공 완료",
    traits: ["수형·색감 밸런스", "유지 관리 매뉴얼 제공"],
    src: imageUrl(32),
  },
  {
    name: "외곽 조경",
    type: "외벽·담장 조경",
    area: "주택 외곽",
    period: "설계 확정 후 시공",
    status: "시공 완료",
    traits: ["프라이버시와 개방감 조절", "야간 조명 연출"],
    src: imageUrl(38),
  },
  {
    name: "가든 다이닝",
    type: "정원 인테리어",
    area: "야외 식사 공간",
    period: "가구·마감 포함 상담",
    status: "시공 완료",
    traits: ["테이블·동선·그늘 설계", "손님맞이 공간으로 완성"],
    src: imageUrl(44),
  },
];

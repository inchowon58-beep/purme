/** 키워드에서 지역명 추출 (예: 수원정원인테리어 → 수원) */
export const SERVICE_SUFFIXES = [
  "테라스인테리어",
  "베란다인테리어",
  "조경인테리어",
  "정원인테리어",
  "정원조경",
  "옥상정원",
  "테라스시공",
  "정원시공",
  "조경시공",
  "조경설계",
  "데크시공",
  "인테리어",
  "조경",
  "테라스",
  "정원",
];

const SEOUL_GU = [
  "강남구", "강동구", "강북구", "강서구", "관악구", "광진구", "구로구", "금천구",
  "노원구", "도봉구", "동대문구", "동작구", "마포구", "서대문구", "서초구", "성동구",
  "성북구", "송파구", "양천구", "영등포구", "용산구", "은평구", "종로구", "중구", "중랑구",
];

const KNOWN_REGIONS = [
  ...SEOUL_GU,
  "의정부", "강남", "서초", "송파", "마포", "영등포", "용산", "종로", "동대문",
  "성북", "강북", "노원", "도봉", "은평", "서대문", "강서", "양천", "구로", "금천",
  "관악", "동작", "광진", "성동", "강동", "일산", "파주", "김포", "고양", "부천",
  "인천", "수원", "용인", "성남", "안양", "안산", "화성", "평택", "시흥", "광명",
  "부산", "대구", "광주", "대전", "울산", "세종", "창원", "천안", "청주", "전주",
  "제주", "춘천", "원주", "포항", "구미", "김해", "진주", "순천", "목포", "여수",
  "하남", "구리", "남양주", "의왕", "군포", "오산", "이천", "아산",
];

export { KNOWN_REGIONS };

const SORTED_REGIONS = [...KNOWN_REGIONS].sort((a, b) => b.length - a.length);

function matchRegionPrefix(normalized: string): string | null {
  for (const region of SORTED_REGIONS) {
    if (normalized.startsWith(region)) return region;
  }
  const auto = normalized.match(/^([가-힣]{2,8}(?:구|시|군|동|읍|면|리))/);
  if (auto?.[1]) return auto[1];
  return null;
}

export function extractRegionFromKeyword(keyword: string): string | null {
  const normalized = keyword.replace(/\s+/g, "").trim();
  if (!normalized) return null;

  const prefix = matchRegionPrefix(normalized);
  if (prefix) return prefix;

  let text = normalized;
  const sorted = [...SERVICE_SUFFIXES].sort((a, b) => b.length - a.length);
  for (const suffix of sorted) {
    if (text.endsWith(suffix)) {
      text = text.slice(0, -suffix.length);
      break;
    }
  }

  text = text.trim();
  if (!text) return null;
  return matchRegionPrefix(text) || (text.length >= 2 && text.length <= 8 ? text : null);
}

/** 키워드에서 SEO 접미사 추출 (예: 수원정원인테리어 → 정원인테리어) */
export function extractKeywordTheme(keyword: string): string {
  const normalized = keyword.replace(/\s+/g, "").trim();
  if (!normalized) return "정원인테리어";
  const sorted = [...SERVICE_SUFFIXES].sort((a, b) => b.length - a.length);
  for (const suffix of sorted) {
    if (suffix.length >= 3 && normalized.includes(suffix)) return suffix;
  }
  return "정원인테리어";
}

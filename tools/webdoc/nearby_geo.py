# -*- coding: utf-8 -*-
"""근방 구·동 · 인근 지하철역 맵 (가이드 페이지 SEO 블록과 동일 용도)."""

from __future__ import annotations

from typing import List, Optional

SERVICE_SUFFIXES = [
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
]

SUB_REGION_MAP = {
    "수원": ["영통동", "광교동", "매탄동", "장안구", "팔달구"],
    "성남": ["분당", "수정", "중원", "판교", "서현"],
    "용인": ["기흥", "수지", "처인", "동백", "상현"],
    "부천": ["중동", "역곡", "소사", "옥길", "상동"],
    "인천": ["부평", "주안", "연수", "송도", "계양"],
    "고양": ["일산", "백석", "정발산", "화정", "행신"],
    "일산": ["주엽", "백석", "정발산", "마두", "대화"],
    "파주": ["운정", "금촌", "교하", "문산", "탄현"],
    "김포": ["장기", "구래", "운양", "사우", "풍무동"],
    "안양": ["평촌", "범계", "관양", "비산", "호계"],
    "안산": ["단원", "상록", "고잔", "선부", "사동"],
    "화성": ["동탄", "병점", "향남", "봉담", "남양"],
    "시흥": ["정왕", "신천", "배곧", "월곶"],
    "광명": ["철산", "하안", "소하", "광명역"],
    "평택": ["비전", "서정", "송탄", "안중", "고덕"],
    "의정부": ["가능", "호원", "민락", "금오", "장암"],
    "남양주": ["다산", "별내", "화도", "진접", "오남"],
    "구리": ["갈매", "인창", "수택", "교문"],
    "하남": ["미사", "감일", "덕풍", "풍산"],
    "강남": ["역삼", "논현", "삼성", "대치", "청담"],
    "서초": ["반포", "잠원", "방배", "양재"],
    "송파": ["잠실", "문정", "가락", "석촌"],
    "마포": ["공덕", "상암", "합정", "연남", "망원"],
    "부산": ["해운대", "수영", "동래", "연제", "사상"],
    "대구": ["수성", "달서", "북구", "동구", "중구"],
    "대전": ["유성", "서구", "중구", "둔산"],
    "광주": ["북구", "서구", "동구", "남구", "상무"],
}

SUBWAY_MAP = {
    "수원": ["수원역", "영통역", "광교역", "매탄권선역", "망포역"],
    "성남": ["모란역", "야탑역", "서현역", "정자역", "판교역"],
    "용인": ["기흥역", "동백역", "보정역", "죽전역", "수지구청역"],
    "부천": ["부천역", "중동역", "상동역", "송내역", "역곡역"],
    "인천": ["부평역", "주안역", "연수역", "송도역", "계양역"],
    "고양": ["화정역", "원당역", "삼송역", "대화역", "정발산역"],
    "일산": ["대화역", "주엽역", "정발산역", "마두역", "백석역"],
    "강남": ["강남역", "역삼역", "선릉역", "삼성역", "압구정역"],
    "서초": ["교대역", "서초역", "방배역", "양재역", "남부터미널역"],
    "송파": ["잠실역", "석촌역", "송파역", "문정역", "가락시장역"],
    "마포": ["홍대입구역", "합정역", "공덕역", "망원역", "상암"],
    "부산": ["서면역", "해운대역", "센텀시티역", "부산역", "동래역"],
    "대구": ["동대구역", "반월당역", "중앙로역", "상인역"],
    "대전": ["대전역", "서대전네거리역", "유성온천역", "정부청사역"],
}

KNOWN_REGIONS = sorted(
    set(list(SUB_REGION_MAP.keys()) + list(SUBWAY_MAP.keys()) + [
        "의왕", "군포", "오산", "이천", "아산", "천안", "청주", "전주",
        "제주", "춘천", "원주", "울산", "세종", "영등포", "은평", "노원",
        "관악", "강서", "양천", "구로",
    ]),
    key=len,
    reverse=True,
)


def normalize_city_key(region: str) -> str:
    t = region.replace(" ", "")
    for suf in ("특별시", "광역시", "특별자치시", "특별자치도", "시", "군", "구"):
        if t.endswith(suf) and len(t) > len(suf):
            t = t[: -len(suf)]
            break
    return t.strip()


def extract_region(keyword: str) -> Optional[str]:
    normalized = keyword.replace(" ", "").strip()
    if not normalized:
        return None
    for region in KNOWN_REGIONS:
        if normalized.startswith(region):
            return region
    text = normalized
    for suffix in sorted(SERVICE_SUFFIXES, key=len, reverse=True):
        if text.endswith(suffix):
            text = text[: -len(suffix)]
            break
    text = text.strip()
    if not text:
        return None
    for region in KNOWN_REGIONS:
        if text.startswith(region):
            return region
    if 2 <= len(text) <= 8:
        return text
    return None


def extract_theme(keyword: str) -> str:
    normalized = keyword.replace(" ", "").strip()
    for suffix in sorted(SERVICE_SUFFIXES, key=len, reverse=True):
        if len(suffix) >= 3 and suffix in normalized:
            return suffix
    return "정원인테리어"


def nearby_areas(region: Optional[str], limit: int = 5) -> List[str]:
    if not region:
        return []
    key = normalize_city_key(region)
    if key in SUB_REGION_MAP:
        return SUB_REGION_MAP[key][:limit]
    for map_key, areas in SUB_REGION_MAP.items():
        if key.startswith(map_key) or map_key.startswith(key):
            return areas[:limit]
    return []


def nearby_stations(region: Optional[str], limit: int = 5) -> List[str]:
    if not region:
        return []
    key = normalize_city_key(region)
    if key in SUBWAY_MAP:
        return SUBWAY_MAP[key][:limit]
    for map_key, stations in SUBWAY_MAP.items():
        if key.startswith(map_key) or map_key.startswith(key):
            return stations[:limit]
    return []


def nearby_html_blocks(keyword: str, city: Optional[str] = None) -> str:
    region = city or extract_region(keyword)
    theme = extract_theme(keyword)
    areas = nearby_areas(region)
    stations = nearby_stations(region)
    if not region or (not areas and not stations):
        return ""
    parts: List[str] = []
    if areas:
        items = "".join(
            f"<li><strong>{a} {theme}</strong><span>{region} 인근 · {a}</span></li>"
            for a in areas
        )
        parts.append(
            f"""<section class="nearby-areas">
<p class="eyebrow">근방 지역 (구·동)</p>
<h2>{region} 인근에서 함께 찾는 {theme} 지역</h2>
<p>{region}에서 {theme}을 알아보는 분들이 방문·시공 범위로 함께 검색하는 근방 구·동입니다.</p>
<ul>{items}</ul>
</section>"""
        )
    if stations:
        items = "".join(
            f"<li><strong>{s} {theme}</strong><span>{region} 인근 · {s}</span></li>"
            for s in stations
        )
        parts.append(
            f"""<section class="nearby-stations">
<p class="eyebrow">인근 지하철역</p>
<h2>{region} 인근 지하철역 {theme} 검색</h2>
<p>{region}에서 {theme}을 찾을 때 방문 동선·환승을 고려해 함께 검색하는 인근 지하철역입니다.</p>
<ul>{items}</ul>
</section>"""
        )
    return "\n".join(parts)


def nearby_keyword_csv(keyword: str) -> str:
    region = extract_region(keyword)
    theme = extract_theme(keyword)
    bits = [f"{a} {theme}" for a in nearby_areas(region)]
    bits += [f"{s} {theme}" for s in nearby_stations(region)]
    return ", ".join(bits)

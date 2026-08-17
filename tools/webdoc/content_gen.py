# -*- coding: utf-8 -*-
"""문서 본문 생성 (템플릿) — 조경인테리어 푸르메정원.
키워드 전달 시 SeoPage 스키마(title/meta/OG/FAQ/hero)로
정원·테라스 인테리어 상세 페이지를 생성합니다. 이미지는 3장.
"""

from __future__ import annotations

import hashlib
import json
import os
import random
import string
from datetime import datetime
from typing import Any, Dict, List
from urllib.parse import quote

from nearby_geo import extract_region, extract_theme, nearby_areas, nearby_html_blocks, nearby_keyword_csv, nearby_stations

BRAND = "푸르메정원"
FARM = "조경인테리어"
SITE_NAME = "조경인테리어 푸르메정원"
PHONE = "010-55606-9637"
PHONE_TEL = "010556069637"
LOCATION = "대한민국 전국"
IMAGE_BASE = "https://image.cattery.co.kr/purme"
IMAGE_COUNT = 59
IMAGE_USE = 3  # 히어로 1 + 본문 2


def _rng(keyword: str, idx: int) -> random.Random:
    seed = int(hashlib.md5(f"{keyword}|{idx}|purme".encode()).hexdigest()[:8], 16)
    return random.Random(seed)


def image_urls(count: int, seed: int) -> List[str]:
    rng = random.Random(seed)
    pool = [f"{IMAGE_BASE}/{i:02d}.webp" for i in range(1, IMAGE_COUNT + 1)]
    rng.shuffle(pool)
    return pool[:count]


def slugify(keyword: str, idx: int) -> str:
    base = "".join(
        c if c.isalnum() or c in "-_" else "-" for c in keyword.lower().replace(" ", "-")
    )
    base = base.strip("-")[:36] or "purme"
    tail = f"{idx:02d}{''.join(random.choices(string.ascii_lowercase + string.digits, k=4))}"
    return f"{base}-{tail}"


def _page_to_summary(page: Dict[str, Any]) -> Dict[str, str]:
    return {
        "slug": page["slug"],
        "keyword": page.get("keyword") or "",
        "title": page.get("title") or page.get("h1") or page["slug"],
        "metaDescription": page.get("metaDescription") or "",
        "h1": page.get("h1") or page.get("title") or page["slug"],
        "createdAt": page.get("createdAt") or "",
        "updatedAt": page.get("updatedAt") or page.get("createdAt") or "",
    }


def build_content(keyword: str, idx: int) -> Dict[str, Any]:
    rng = _rng(keyword, idx)
    kw = keyword.strip() or "정원인테리어"
    heroes = [
        "Garden & Terrace Interior · Trusted Craft",
        "Landscape Design with Honest Process",
        "From Consultation to Finished Garden",
        "Purme Garden · Spaces That Last",
    ]
    line2_opts = [
        "정원 · 테라스 인테리어",
        "신뢰 시공",
        "상담부터 완공까지",
        "전국 상담 가능",
    ]
    bar_opts = [
        "견적과 과정을 숨기지 않습니다",
        "전화 한 통으로 차분히 안내합니다",
        "현장 조건에 맞춰 설계합니다",
        "완공 후에도 관리를 안내합니다",
    ]
    intro_h2 = [
        f"{kw}, 왜 전문 시공이 필요할까요",
        f"{kw} 알아보기 전 꼭 확인할 점",
        f"신뢰 있는 선택을 위한 {kw} 안내",
        f"{kw}와 푸르메정원의 시공 원칙",
    ]

    title = f"{kw} | {FARM} {BRAND} 정원·테라스 시공"
    if len(title) > 60:
        title = f"{kw} | {FARM} {BRAND}"
    region = extract_region(kw)
    theme = extract_theme(kw)
    areas = nearby_areas(region)
    stations = nearby_stations(region)
    meta_desc = (
        f"{kw} 안내 — {FARM} {BRAND}는 정원인테리어와 테라스인테리어를 책임 있게 상담·시공합니다. "
        f"투명한 견적, 현장 실측, 완공 후 관리 안내. 문의 {PHONE}."
    )
    if areas or stations:
        near_bits = " · ".join((areas[:3] + stations[:3])[:4])
        meta_desc = f"{meta_desc} 근방·인근({near_bits}) {theme} 검색 안내."
    if len(meta_desc) > 160:
        meta_desc = meta_desc[:157] + "..."

    variants = ["차분히", "꼼꼼히", "명확하게"]
    tone = variants[idx % len(variants)]
    h2_0 = intro_h2[idx % len(intro_h2)]

    sections = [
        {
            "h2": h2_0,
            "paragraphs": [
                f"{kw}를 검색하셨다면, 가장 먼저 확인할 것은 사진보다 실제 생활과 맞는 마감입니다. "
                f"{FARM} {BRAND}는 {tone} 상담부터 설계·시공까지 한곳에서 안내합니다.",
                f"자재와 식재는 일조·배수·동선을 먼저 본 뒤 제안합니다. "
                f"{BRAND}는 과장된 효과보다 오래 쓸 수 있는 마감을 원칙으로 합니다.",
                f"상담은 전화({PHONE})로 가능합니다. 공간 형태·예산·희망 분위기를 말씀해 주시면 "
                f"실측과 시공 절차를 차분히 안내드립니다.",
            ],
        },
        {
            "h2": f"{BRAND}가 {kw}에서 지키는 약속",
            "paragraphs": [
                f"투명한 견적, 현장 공유, 완공 후 관리 안내가 {BRAND}의 기준입니다. "
                f"불필요한 시공보다 공간과 예산의 균형을 우선합니다.",
                f"상담 범위는 {LOCATION}입니다. 현장 방문이 필요한 경우 실측 일정도 함께 조율합니다.",
                f"{kw}로 찾아오신 분이라면, 범위·자재·일정을 먼저 확인하신 뒤 "
                f"전화 상담을 권합니다. 문의 {PHONE}.",
            ],
        },
        {
            "h2": f"{kw} FAQ와 다음 단계",
            "paragraphs": [
                f"{kw} 상담은 홈페이지 문의 또는 {PHONE} 전화로 가능합니다. "
                f"정원인테리어·테라스인테리어 모두 같은 번호로 연결됩니다.",
                f"{BRAND}는 믿을 수 있는 과정과 오래 남을 풍경을 함께 만듭니다. 지금 바로 상담해 주세요.",
            ],
        },
    ]
    faqs = [
        {
            "q": f"{kw} 상담은 어떻게 하나요?",
            "a": f"사이트 하단 문의 또는 {PHONE} 전화로 접수합니다. "
            f"공간·예산·희망 일정을 알려주시면 {BRAND}가 확인 후 안내합니다.",
        },
        {
            "q": "정원 인테리어와 테라스 인테리어 모두 가능한가요?",
            "a": f"네. {BRAND}는 정원·테라스·옥상·베란다 조경 인테리어를 함께 안내합니다. "
            f"현장 조건에 맞춰 설계와 시공 범위를 제안드립니다.",
        },
        {
            "q": f"{kw} 전국에서 이용할 수 있나요?",
            "a": "전국 상담이 가능합니다. 실측·시공이 필요한 경우 일정 조율 후 진행합니다. "
            f"문의 {PHONE}.",
        },
        {
            "q": "푸르메정원 문의 전화번호는?",
            "a": f"{PHONE}입니다. {FARM} {BRAND}로 연락 주시면 됩니다.",
        },
    ]
    now = datetime.utcnow().isoformat() + "Z"
    line2 = line2_opts[idx % len(line2_opts)]
    geo_kw = nearby_keyword_csv(kw)
    meta_keywords = (
        f"{kw}, 정원인테리어, 테라스인테리어, 조경인테리어, 푸르메정원, "
        f"정원시공, 테라스시공, 조경설계, 옥상정원"
    )
    if geo_kw:
        meta_keywords = f"{meta_keywords}, {geo_kw}"
    return {
        "slug": slugify(kw, idx),
        "keyword": kw,
        "title": title,
        "metaDescription": meta_desc,
        "metaKeywords": meta_keywords,
        "h1": f"{kw} — {BRAND} 정원·테라스 인테리어",
        "heroSubtitle": heroes[idx % len(heroes)],
        "heroBadge": "신뢰 시공",
        "heroTitleLine1": kw,
        "heroTitleLine2": line2,
        "heroBar": bar_opts[idx % len(bar_opts)],
        "sections": sections,
        "faqs": faqs,
        "images": image_urls(IMAGE_USE, rng.randint(1, 99999)),
        "ctaText": f"인테리어상담문의 {PHONE} — {BRAND}",
        "nearbyAreas": areas,
        "nearbyStations": stations,
        "regionLabel": region or "",
        "keywordTheme": theme,
        "createdAt": now,
        "updatedAt": now,
    }


def write_html(page: Dict[str, Any], site_url: str) -> str:
    imgs = page.get("images") or []
    hero = imgs[0] if imgs else ""
    sections = ""
    for i, sec in enumerate(page["sections"]):
        ps = "".join(f"<p>{p}</p>" for p in sec["paragraphs"])
        sections += f"<section><h2>{sec['h2']}</h2>{ps}</section>"
        if i < 2 and i + 1 < len(imgs):
            sections += (
                f'<figure><img src="{imgs[i+1]}" alt="{page["keyword"]} 인테리어 {i+2}" '
                f'loading="lazy"/></figure>'
            )
    faqs = "".join(
        f"<details><summary>{f['q']}</summary><p>{f['a']}</p></details>" for f in page["faqs"]
    )
    nearby = nearby_html_blocks(page.get("keyword") or "", page.get("regionLabel") or None)
    url = f"{site_url.rstrip('/')}/guide/{page['slug']}"
    og = hero or ""
    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<title>{page['title']}</title>
<meta name="description" content="{page['metaDescription']}"/>
<meta name="keywords" content="{page['metaKeywords']}"/>
<link rel="canonical" href="{url}"/>
<meta property="og:type" content="article"/>
<meta property="og:title" content="{page['title']}"/>
<meta property="og:description" content="{page['metaDescription']}"/>
<meta property="og:url" content="{url}"/>
<meta property="og:image" content="{og}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="{page['title']}"/>
<meta name="twitter:description" content="{page['metaDescription']}"/>
<meta name="twitter:image" content="{og}"/>
</head>
<body>
<header><a href="{site_url}">{SITE_NAME}</a></header>
<article>
<h1>{page['h1']}</h1>
<p>{page['heroSubtitle']}</p>
{sections}
<section><h2>자주 묻는 질문</h2>{faqs}</section>
{nearby}
<p><a href="tel:{PHONE_TEL}">{page['ctaText']}</a></p>
</article>
</body>
</html>"""


def generate_batch(
    keywords: List[str],
    out_dir: str,
    site_url: str,
    sync_public: str = "",
    stop_requested=None,
) -> List[str]:
    os.makedirs(out_dir, exist_ok=True)
    pages_dir = os.path.join(out_dir, "pages")
    os.makedirs(pages_dir, exist_ok=True)
    slugs: List[str] = []
    entries: List[Dict[str, str]] = []
    urls: List[str] = []
    for i, kw in enumerate(keywords, 1):
        if stop_requested and stop_requested():
            break
        page = build_content(kw, i)
        slugs.append(page["slug"])
        entries.append(_page_to_summary(page))
        with open(os.path.join(pages_dir, f"{page['slug']}.json"), "w", encoding="utf-8") as f:
            json.dump(page, f, ensure_ascii=False, indent=2)
        html = write_html(page, site_url)
        with open(os.path.join(out_dir, f"{page['slug']}.html"), "w", encoding="utf-8") as f:
            f.write(html)
        urls.append(f"{site_url.rstrip('/')}/guide/{quote(page['slug'])}")
    if not urls:
        return []
    index = {
        "slugs": slugs,
        "entries": entries,
        "updatedAt": datetime.utcnow().isoformat() + "Z",
    }
    with open(os.path.join(out_dir, "index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    with open(os.path.join(out_dir, "urls.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(urls))
    if sync_public:
        pub_pages = os.path.join(sync_public, "pages")
        os.makedirs(pub_pages, exist_ok=True)
        existing: Dict[str, Any] = {"slugs": [], "entries": [], "updatedAt": ""}
        idx_path = os.path.join(sync_public, "index.json")
        if os.path.isfile(idx_path):
            with open(idx_path, encoding="utf-8") as f:
                existing = json.load(f)
        by_slug = {e["slug"]: e for e in (existing.get("entries") or []) if e.get("slug")}
        for slug, entry in zip(slugs, entries):
            if stop_requested and stop_requested():
                break
            src = os.path.join(pages_dir, f"{slug}.json")
            dst = os.path.join(pub_pages, f"{slug}.json")
            with open(src, encoding="utf-8") as f:
                data = f.read()
            with open(dst, "w", encoding="utf-8") as f:
                f.write(data)
            by_slug[slug] = entry
            if slug in existing.get("slugs", []):
                existing["slugs"].remove(slug)
            existing.setdefault("slugs", []).insert(0, slug)
        existing["entries"] = [by_slug[s] for s in existing["slugs"] if s in by_slug]
        existing["updatedAt"] = datetime.utcnow().isoformat() + "Z"
        with open(idx_path, "w", encoding="utf-8") as f:
            json.dump(existing, f, ensure_ascii=False, indent=2)
    return urls

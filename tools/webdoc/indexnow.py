# -*- coding: utf-8 -*-
"""IndexNow 제출 — 조경인테리어 푸르메정원 로컬/서버 공통 키."""

from __future__ import annotations

import json
import os
from typing import Iterable, List, Optional, Tuple
from urllib.parse import urlparse

try:
    import requests
except ImportError:  # pragma: no cover
    requests = None  # type: ignore

INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow"
# Next public/{key}.txt 와 동일
DEFAULT_KEY = "b7e4d9c2a1f8563048e7b6c5d4a39281"
DEFAULT_HOST = "www.purmegarden.co.kr"


def get_indexnow_key() -> str:
    env = os.environ.get("INDEXNOW_KEY", "").strip()
    if env:
        return env
    here = os.path.dirname(os.path.abspath(__file__))
    # tools/webdoc → 프로젝트 public
    pub = os.path.abspath(os.path.join(here, "..", "..", "public", f"{DEFAULT_KEY}.txt"))
    if os.path.isfile(pub):
        return open(pub, encoding="utf-8").read().strip() or DEFAULT_KEY
    return DEFAULT_KEY


def host_from_url(url: str) -> str:
    p = urlparse(url)
    return p.netloc or DEFAULT_HOST


def submit_indexnow(
    site_url: str,
    urls: Iterable[str],
    key: Optional[str] = None,
    timeout: int = 30,
) -> Tuple[bool, str]:
    """글 URL만 제출. 건수 = 실제 글 수 (사이트맵 등 부가 URL 제외)."""
    if requests is None:
        return False, "requests 패키지가 필요합니다. pip install requests"

    key = (key or get_indexnow_key()).strip()
    base = site_url.rstrip("/")
    host = host_from_url(base)
    url_list: List[str] = []
    seen = set()
    for u in urls:
        u = (u or "").strip()
        if u and u not in seen:
            seen.add(u)
            url_list.append(u)
    if not url_list:
        return False, "제출할 URL이 없습니다."

    payload = {
        "host": host,
        "key": key,
        "keyLocation": f"{base}/{key}.txt",
        "urlList": url_list,
    }
    try:
        resp = requests.post(
            INDEXNOW_ENDPOINT,
            headers={"Content-Type": "application/json; charset=utf-8"},
            data=json.dumps(payload),
            timeout=timeout,
        )
        if resp.status_code in (200, 202):
            return True, f"IndexNow 성공 · 글 {len(url_list)}건"
        return False, f"IndexNow 실패 HTTP {resp.status_code}: {resp.text[:300]}"
    except Exception as exc:
        return False, f"IndexNow 요청 오류: {exc}"

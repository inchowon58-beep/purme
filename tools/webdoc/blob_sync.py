# -*- coding: utf-8 -*-
"""Vercel private Blob 업로드 — Node 없이 Python requests만 사용.

Blob pathname 은 ASCII 만 허용 → 한글 slug 는 sha256 키(p_…)로 저장.
사이트(seo-pages.ts)의 blobPageKey 와 동일 규칙.

API: @vercel/blob 최신과 동일하게 x-api-version=12 + x-vercel-blob-store-id 필요.
(구버전 7 은 pathname 쿼리를 인식하지 못해 Invalid pathname 을 냄)
"""

from __future__ import annotations

import hashlib
import json
import os
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import requests

from project_paths import project_root, webdoc_dir

BLOB_API = "https://vercel.com/api/blob"
BLOB_PREFIX = "seo-data"
BLOB_API_VERSION = "12"
BLOB_SYNC_BUILD = "20260813-api12-v4"


def blob_page_key(slug: str) -> str:
    h = hashlib.sha256(slug.encode("utf-8")).hexdigest()[:24]
    return f"p_{h}"


def blob_page_pathname(slug: str) -> str:
    key = blob_page_key(slug)
    path = f"{BLOB_PREFIX}/pages/{key}.json"
    if not path.isascii():
        raise RuntimeError(f"non-ASCII blob path generated: {path!r}")
    return path


def parse_store_id(token: str) -> str:
    """vercel_blob_rw_<storeId>_<secret> → storeId (SDK와 동일)."""
    parts = (token or "").split("_")
    return parts[3] if len(parts) >= 4 else ""


def _load_token_from_settings() -> Optional[str]:
    path = os.path.join(webdoc_dir(), "settings.json")
    if not os.path.isfile(path):
        return None
    try:
        data = json.load(open(path, encoding="utf-8"))
        tok = (data.get("blob_token") or data.get("BLOB_READ_WRITE_TOKEN") or "").strip()
        return tok or None
    except (OSError, json.JSONDecodeError):
        return None


def _load_token_from_env_files() -> Optional[str]:
    roots = [webdoc_dir(), project_root(), os.getcwd()]
    seen = set()
    for root in roots:
        root = os.path.abspath(root)
        if root in seen:
            continue
        seen.add(root)
        for name in (".env.local", ".env"):
            path = os.path.join(root, name)
            if not os.path.isfile(path):
                continue
            try:
                text = open(path, encoding="utf-8").read()
            except OSError:
                continue
            m = re.search(
                r"^(?:export\s+)?BLOB_READ_WRITE_TOKEN\s*=\s*[\"']?([^\"'\r\n#]+)[\"']?",
                text,
                re.M,
            )
            if m:
                return m.group(1).strip()
    return None


def load_blob_token() -> Optional[str]:
    env = os.environ.get("BLOB_READ_WRITE_TOKEN", "").strip()
    if env:
        return env
    return _load_token_from_settings() or _load_token_from_env_files()


def _headers(token: str, content_type: str = "application/json; charset=utf-8") -> Dict[str, str]:
    sid = parse_store_id(token)
    h: Dict[str, str] = {
        "Authorization": f"Bearer {token}",
        "x-api-version": BLOB_API_VERSION,
        "x-content-type": content_type,
        "x-vercel-blob-access": "private",
        "x-add-random-suffix": "0",
        "x-allow-overwrite": "1",
    }
    if sid:
        h["x-vercel-blob-store-id"] = sid
    return h


def put_blob_private(pathname: str, body: str, token: str) -> Tuple[bool, str]:
    if not pathname or not pathname.isascii():
        return False, f"Invalid pathname (ASCII only): {pathname!r}"
    if "//" in pathname:
        return False, f"Invalid pathname (//): {pathname!r}"
    if not parse_store_id(token):
        return False, "토큰 형식 오류 (vercel_blob_rw_<storeId>_… 필요)"
    try:
        resp = requests.put(
            BLOB_API,
            params={"pathname": pathname},
            data=body.encode("utf-8"),
            headers=_headers(token),
            timeout=90,
        )
        if resp.status_code in (200, 201):
            return True, "ok"
        return False, f"HTTP {resp.status_code} path={pathname}: {resp.text[:240]}"
    except Exception as e:
        return False, f"{e} path={pathname}"


def get_blob_text(pathname: str, token: str) -> Optional[str]:
    if not pathname.isascii():
        return None
    hdr = {
        "Authorization": f"Bearer {token}",
        "x-api-version": BLOB_API_VERSION,
    }
    sid = parse_store_id(token)
    if sid:
        hdr["x-vercel-blob-store-id"] = sid
    try:
        resp = requests.get(
            f"{BLOB_API}/access",
            params={"pathname": pathname},
            headers=hdr,
            timeout=60,
        )
        if resp.status_code == 200 and resp.text:
            try:
                data = resp.json()
                if isinstance(data, dict):
                    dl = data.get("downloadUrl") or data.get("url")
                    if dl:
                        r2 = requests.get(
                            dl,
                            headers={"Authorization": f"Bearer {token}"},
                            timeout=60,
                        )
                        if r2.status_code == 200:
                            return r2.text
            except json.JSONDecodeError:
                return resp.text
    except Exception:
        pass

    try:
        resp = requests.get(
            BLOB_API,
            params={"prefix": pathname, "limit": 20},
            headers=hdr,
            timeout=60,
        )
        if resp.status_code != 200:
            return None
        payload = resp.json()
        blobs = payload.get("blobs") or []
        match = next((b for b in blobs if b.get("pathname") == pathname), None)
        if not match and blobs:
            match = blobs[0]
        if not match:
            return None
        dl = match.get("downloadUrl") or match.get("url")
        if not dl:
            return None
        r2 = requests.get(
            dl,
            headers={"Authorization": f"Bearer {token}"},
            timeout=60,
        )
        if r2.status_code == 200:
            return r2.text
    except Exception:
        return None
    return None


def sync_pages_dir_to_blob(
    pages_dir: str,
    stop_requested=None,
) -> Tuple[bool, str]:
    """pages/*.json + index.json 을 private Blob에 올려 운영 사이트에 즉시 반영."""
    token = load_blob_token()
    if not token:
        return (
            False,
            "BLOB_READ_WRITE_TOKEN 없음 — [블로그 등록] 탭 또는 settings.json 에 blob_token 을 넣으세요.",
        )
    if not os.path.isdir(pages_dir):
        return False, f"pages 폴더 없음: {pages_dir}"

    files = [
        os.path.join(pages_dir, f)
        for f in os.listdir(pages_dir)
        if f.endswith(".json")
    ]
    if not files:
        return False, "업로드할 JSON이 없습니다."

    slugs: List[str] = []
    entries: List[Dict[str, Any]] = []
    raw = get_blob_text(f"{BLOB_PREFIX}/index.json", token)
    if raw:
        try:
            prev = json.loads(raw)
            slugs = list(prev.get("slugs") or [])
            entries = list(prev.get("entries") or [])
        except json.JSONDecodeError:
            slugs = []
            entries = []

    uploaded: List[str] = []
    sample_path = ""
    for file in files:
        if stop_requested and stop_requested():
            if uploaded:
                # 부분 업로드라도 index 반영
                break
            return False, "중지 요청으로 Blob 업로드를 중단했습니다."
        try:
            page: Dict[str, Any] = json.load(open(file, encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as e:
            return False, f"JSON 읽기 실패: {file} ({e})"
        slug = page.get("slug") or ""
        if not slug:
            continue
        pathname = blob_page_pathname(slug)
        if not sample_path:
            sample_path = pathname
        ok, msg = put_blob_private(
            pathname, json.dumps(page, ensure_ascii=False), token
        )
        if not ok:
            return False, f"Blob 업로드 실패 slug={slug} → {msg}"
        slugs = [s for s in slugs if s != slug]
        slugs.insert(0, slug)
        entry = {
            "slug": slug,
            "keyword": page.get("keyword") or "",
            "title": page.get("title") or page.get("h1") or slug,
            "metaDescription": page.get("metaDescription") or "",
            "h1": page.get("h1") or page.get("title") or slug,
            "createdAt": page.get("createdAt") or "",
            "updatedAt": page.get("updatedAt") or page.get("createdAt") or "",
        }
        entries = [e for e in entries if e.get("slug") != slug]
        entries.insert(0, entry)
        uploaded.append(slug)

    if not uploaded:
        return False, "중지 요청으로 Blob 업로드를 중단했습니다."

    if stop_requested and stop_requested() and uploaded:
        # 이미 올린 것만 index에 반영하고 종료
        pass

    slug_set = set(slugs)
    entries = [e for e in entries if e.get("slug") in slug_set]
    have = {e.get("slug") for e in entries}
    for s in slugs:
        if s not in have:
            entries.append(
                {
                    "slug": s,
                    "keyword": "",
                    "title": s,
                    "metaDescription": "",
                    "h1": s,
                    "createdAt": "",
                    "updatedAt": "",
                }
            )

    index = {
        "slugs": slugs,
        "entries": entries,
        "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
    }
    ok, msg = put_blob_private(
        f"{BLOB_PREFIX}/index.json",
        json.dumps(index, ensure_ascii=False, indent=2),
        token,
    )
    if not ok:
        return False, f"Blob index 실패: {msg}"
    stopped = " · 중지됨(부분)" if stop_requested and stop_requested() else ""
    return (
        True,
        f"Blob 업로드 완료 [{BLOB_SYNC_BUILD}] · {len(uploaded)}건 · 예: {sample_path}{stopped}",
    )

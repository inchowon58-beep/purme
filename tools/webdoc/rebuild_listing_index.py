# -*- coding: utf-8 -*-
"""로컬 public/seo-data/pages 또는 webdoc seo-data 로 index.entries 를 한 번에 채움.

사용:
  python tools/webdoc/rebuild_listing_index.py

기존 글 제목이 /guide 목록에 stub(slug)로만 보일 때 1회 실행.
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.dirname(__file__))

from blob_sync import (  # noqa: E402
    BLOB_PREFIX,
    get_blob_text,
    load_blob_token,
    put_blob_private,
)
from project_paths import project_root, webdoc_dir  # noqa: E402


def find_pages_dirs() -> list[str]:
    dirs = []
    for cand in (
        os.path.join(project_root(), "public", "seo-data", "pages"),
        os.path.join(webdoc_dir(), "seo-data", "pages"),
    ):
        if os.path.isdir(cand):
            dirs.append(cand)
    return dirs


def main() -> int:
    token = load_blob_token()
    if not token:
        print("BLOB_READ_WRITE_TOKEN 없음")
        return 1

    by_slug: dict = {}
    for d in find_pages_dirs():
        for name in os.listdir(d):
            if not name.endswith(".json"):
                continue
            path = os.path.join(d, name)
            try:
                page = json.load(open(path, encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                continue
            slug = page.get("slug") or name[:-5]
            by_slug[slug] = page

    raw = get_blob_text(f"{BLOB_PREFIX}/index.json", token)
    slugs = []
    if raw:
        try:
            slugs = list(json.loads(raw).get("slugs") or [])
        except json.JSONDecodeError:
            slugs = []
    if not slugs:
        slugs = list(by_slug.keys())

    entries = []
    missing = 0
    for slug in slugs:
        page = by_slug.get(slug)
        if not page:
            missing += 1
            entries.append(
                {
                    "slug": slug,
                    "keyword": "",
                    "title": slug,
                    "metaDescription": "",
                    "h1": slug,
                    "createdAt": "",
                    "updatedAt": "",
                }
            )
            continue
        entries.append(
            {
                "slug": slug,
                "keyword": page.get("keyword") or "",
                "title": page.get("title") or page.get("h1") or slug,
                "metaDescription": page.get("metaDescription") or "",
                "h1": page.get("h1") or page.get("title") or slug,
                "createdAt": page.get("createdAt") or "",
                "updatedAt": page.get("updatedAt") or page.get("createdAt") or "",
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
        print("실패:", msg)
        return 1
    print(f"index.entries 갱신 완료 · {len(entries)}건 (로컬 매칭 실패 stub {missing}건)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

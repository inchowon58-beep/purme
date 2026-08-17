# -*- coding: utf-8 -*-
"""번들된 naver_vm 으로 네이버 서치어드바이저 웹문서 등록."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Callable, List, Optional, Tuple

from project_paths import webdoc_dir

LogFn = Callable[[str], None]


def _naver_vm_dir() -> Path:
    """소스: tools/webdoc/naver_vm · exe: _MEIPASS/naver_vm 또는 exe옆/naver_vm."""
    here = Path(__file__).resolve().parent
    candidates = [
        here / "naver_vm",
        Path(getattr(sys, "_MEIPASS", here)) / "naver_vm",
        Path(webdoc_dir()) / "naver_vm",
    ]
    for c in candidates:
        if (c / "naver_searchadvisor.py").is_file():
            return c
    return candidates[0]


def ensure_naver_import() -> Path:
    root = _naver_vm_dir()
    if not (root / "naver_searchadvisor.py").is_file():
        raise FileNotFoundError(
            f"naver_vm 모듈 없음: {root} — 배포 폴더에 naver_vm 이 포함되어야 합니다."
        )
    root_s = str(root.resolve())
    if root_s not in sys.path:
        sys.path.insert(0, root_s)
    return root


def urls_file_path() -> Path:
    return Path(webdoc_dir()) / "urls.txt"


def submit_log_path() -> Path:
    return Path(webdoc_dir()) / "naver_submit_log.json"


def append_urls_file(urls: List[str]) -> Path:
    path = urls_file_path()
    existing: list[str] = []
    if path.is_file():
        existing = [
            ln.strip()
            for ln in path.read_text(encoding="utf-8").splitlines()
            if ln.strip()
        ]
    seen = set(existing)
    for u in urls:
        u = (u or "").strip()
        if u and u not in seen:
            existing.append(u)
            seen.add(u)
    path.write_text("\n".join(existing) + ("\n" if existing else ""), encoding="utf-8")
    return path


def load_all_saved_urls() -> List[str]:
    path = urls_file_path()
    if not path.is_file():
        return []
    return [
        ln.strip()
        for ln in path.read_text(encoding="utf-8").splitlines()
        if ln.strip() and not ln.strip().startswith("#")
    ]


def _url_key(url: str) -> str:
    return (url or "").strip().rstrip("/").lower()


def pending_urls(*, site_url: str = "") -> List[str]:
    """urls.txt 중 성공 로그에 없는 URL (오늘 미등록 재요청용)."""
    import json

    ok_keys: set[str] = set()
    log_path = submit_log_path()
    if log_path.is_file():
        try:
            data = json.loads(log_path.read_text(encoding="utf-8"))
            for day in (data.get("days") or {}).values():
                for entry in day.get("entries") or []:
                    if not entry.get("ok"):
                        continue
                    u = str(entry.get("url") or "").strip()
                    if u:
                        ok_keys.add(_url_key(u))
        except (OSError, json.JSONDecodeError, TypeError):
            pass

    out: list[str] = []
    for u in load_all_saved_urls():
        if _url_key(u) in ok_keys:
            continue
        out.append(u)
    return out


def register_urls(
    urls: List[str],
    *,
    vm_path: str = "",  # 호환용(무시 — 번들 naver_vm 사용)
    naver_id: str,
    naver_password: str,
    naver_site: str,
    daily_limit: int = 50,
    delay_min: float = 3.0,
    delay_max: float = 8.0,
    twocaptcha_api_key: str = "",
    on_log: Optional[LogFn] = None,
    stop_requested: Optional[Callable[[], bool]] = None,
    login_retries: int = 3,
) -> Tuple[bool, str]:
    urls = [u.strip() for u in urls if u and u.strip()]
    if not urls:
        return False, "등록할 URL이 없습니다."
    if not naver_site.strip():
        return False, "등록 사이트 URL이 없습니다."
    if not (naver_id.strip() and naver_password.strip()):
        return False, "블로그 아이디·비밀번호가 필요합니다."

    def log(msg: str) -> None:
        if on_log:
            on_log(msg)

    try:
        ensure_naver_import()
    except FileNotFoundError as e:
        return False, str(e)

    try:
        from naver_searchadvisor import (  # type: ignore
            LoginTypingOptions,
            NaverSubmitOptions,
            _patch_uc_chrome_lifecycle,
            normalize_site_url,
            safe_quit_driver,
            submit_crawl_urls,
        )

        _patch_uc_chrome_lifecycle()
    except Exception as e:
        return False, f"블로그 모듈 로드 실패: {e}"

    try:
        append_urls_file(urls)
        log(f"urls.txt 갱신 ({len(urls)}건)")
    except OSError as e:
        log(f"urls.txt 저장 경고: {e}")

    opts = NaverSubmitOptions(
        site_url=normalize_site_url(naver_site.strip()),
        daily_limit=max(1, min(10000, int(daily_limit))),
        delay_min_sec=max(1.0, float(delay_min)),
        delay_max_sec=max(float(delay_min), float(delay_max)),
        submit_log_path=submit_log_path(),
        typing=LoginTypingOptions(),
    )

    report = None
    try:
        report = submit_crawl_urls(
            urls,
            opts,
            on_log=log,
            naver_id=naver_id.strip(),
            naver_password=naver_password.strip(),
            twocaptcha_api_key=(twocaptcha_api_key or "").strip(),
            stop_requested=stop_requested,
            keep_browser_open=False,
            allow_manual_login=False,  # 팝업 대기 없이 실패 → Chrome 재시작 재시도
            login_retries=max(1, int(login_retries)),
        )
        try:
            if report and getattr(report, "driver", None) is not None:
                safe_quit_driver(report.driver, on_log=log)
                report.driver = None
        except Exception:
            pass
        msg = (
            f"블로그 등록 완료 — 성공 {report.success_count}건, "
            f"실패 {report.fail_count}건, 스킵 {len(report.skipped)}건 · 크롬 종료"
        )
        return report.success_count > 0 or report.fail_count == 0, msg
    except Exception as e:
        if report is not None:
            try:
                if getattr(report, "driver", None) is not None:
                    safe_quit_driver(report.driver, on_log=log)
            except Exception:
                pass
        return False, f"블로그 등록 오류: {e}"

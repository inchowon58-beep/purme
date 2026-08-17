# -*- coding: utf-8 -*-
"""웹 UI용 런타임 상태·발행 파이프라인."""

from __future__ import annotations

import os
import subprocess
import threading
import webbrowser
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from blob_sync import load_blob_token, sync_pages_dir_to_blob
from combo_queue import QueueState, dequeue, fill_queue, load_queue, parse_lines, save_queue
from content_gen import generate_batch
from indexnow import submit_indexnow
from naver_register import pending_urls, register_urls
from project_paths import project_root, webdoc_dir
from scheduler import DailyScheduler, parse_hhmm
from settings_store import DEFAULT_SITE_URL, load_settings, queue_path, save_settings


def _public_msg(msg: str) -> str:
    """UI/로그에 노출되는 문구에서 '네이버·웹문서' 표현을 '블로그'로 통일."""
    s = str(msg or "")
    replacements = (
        ("인포씨(네이버)", "인포씨"),
        ("네이버 서치어드바이저", "블로그"),
        ("네이버 등록", "블로그 등록"),
        ("네이버 로그인", "블로그 로그인"),
        ("네이버 자동", "블로그 자동"),
        ("네이버 세션", "블로그 세션"),
        ("네이버 계정", "블로그 계정"),
        ("네이버 상세", "블로그 상세"),
        ("네이버 로그", "블로그 로그"),
        ("[네이버]", "[블로그]"),
        ("미등록 웹문서", "미등록 블로그"),
        ("웹문서 등록", "블로그 등록"),
        ("웹문서", "블로그"),
        ("네이버", "블로그"),
    )
    for a, b in replacements:
        s = s.replace(a, b)
    return s


def open_urls_in_chrome(urls: List[str], *, limit: int = 3) -> str:
    targets = [u for u in urls if u][: max(1, limit)]
    if not targets:
        return "열 URL 없음"
    chrome_candidates = [
        os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe"),
    ]
    chrome = next((p for p in chrome_candidates if os.path.isfile(p)), None)
    try:
        if chrome:
            subprocess.Popen([chrome, "--new-window", *targets], close_fds=True)
            return f"Chrome으로 {len(targets)}건 열림"
        for u in targets:
            webbrowser.open(u)
        return f"기본 브라우저로 {len(targets)}건 열림"
    except Exception as e:
        return f"브라우저 열기 실패: {e}"


class WebdocRuntime:
    def __init__(self) -> None:
        self.settings: Dict[str, Any] = load_settings()
        if not (self.settings.get("blob_token") or "").strip():
            tok = load_blob_token()
            if tok:
                self.settings["blob_token"] = tok
        self.queue: Optional[QueueState] = load_queue(queue_path())
        self.logs: List[str] = []
        self.naver_logs: List[str] = []
        self.last_urls: List[str] = []
        self.running = False
        self.stop_requested = False
        self.status = "대기 중"
        self.schedule_status = "스케줄: 꺼짐"
        self._scheduler: Optional[DailyScheduler] = None
        self._lock = threading.Lock()
        self.quit_requested = False
        self.admin_unlocked = False
        if self.settings.get("schedule_enabled"):
            self.restart_scheduler()

    def log(self, msg: str) -> None:
        line = f"[{datetime.now().strftime('%H:%M:%S')}] {_public_msg(msg)}"
        self.logs.append(line)
        if len(self.logs) > 500:
            self.logs = self.logs[-500:]

    def log_naver(self, msg: str) -> None:
        """블로그 등록 전용 로그 (관리자 인증 후에만 UI 표시)."""
        line = f"[{datetime.now().strftime('%H:%M:%S')}] {_public_msg(msg)}"
        self.naver_logs.append(line)
        if len(self.naver_logs) > 800:
            self.naver_logs = self.naver_logs[-800:]
        # 일반 로그에는 요약만
        short = msg if len(msg) < 80 else msg[:77] + "…"
        if any(
            k in msg
            for k in (
                "등록 시작",
                "등록 완료",
                "등록 오류",
                "자동 로그인",
                "로그인 실패",
                "로그인 재시도",
                "미등록",
            )
        ):
            self.log(f"[블로그] {_public_msg(short)}")

    def unlock_admin(self, password: str) -> bool:
        if (password or "").strip() == "ybijour80":
            self.admin_unlocked = True
            self.log("관리자 인증 성공 — 블로그 상세 로그 표시")
            return True
        self.admin_unlocked = False
        return False

    def lock_admin(self) -> None:
        self.admin_unlocked = False
        self.log("관리자 로그 잠금")

    def snapshot(self) -> Dict[str, Any]:
        q = self.queue
        pending_n = 0
        try:
            pending_n = len(pending_urls())
        except Exception:
            pending_n = 0
        return {
            "settings": self.settings,
            "status": _public_msg(self.status),
            "schedule_status": _public_msg(self.schedule_status),
            "running": self.running,
            "logs": self.logs[-120:],
            "naver_logs": self.naver_logs[-200:] if self.admin_unlocked else [],
            "admin_unlocked": self.admin_unlocked,
            "pending_naver_count": pending_n,
            "last_urls": self.last_urls,
            "queue": {
                "remaining": q.remaining if q else 0,
                "published_count": q.published_count if q else 0,
                "total_target": q.total_target if q else 0,
                "daily_limit": q.daily_limit if q else int(self.settings.get("daily_limit") or 50),
                "days_left": q.days_left if q else 0,
                "summary": self.queue_summary(),
            },
        }

    def queue_summary(self) -> str:
        if not self.queue or not self.queue.pending:
            done = self.queue.published_count if self.queue else 0
            target = self.queue.total_target if self.queue else 0
            return f"큐: 비어 있음 · 누적 발행 {done}/{target or '—'}"
        q = self.queue
        return (
            f"큐 남음 {q.remaining}건 · 하루 {q.daily_limit}건 → 약 {q.days_left}일 "
            f"· 누적 {q.published_count}/{q.total_target}"
        )

    def save_settings(self, data: Dict[str, Any]) -> None:
        prev_enabled = bool(self.settings.get("schedule_enabled"))
        prev_time = str(self.settings.get("schedule_time") or "")
        self.settings.update(data)
        enabled = bool(self.settings.get("schedule_enabled"))
        hhmm = str(self.settings.get("schedule_time") or "09:00")
        if enabled and not parse_hhmm(hhmm):
            self.log("스케줄 시각 형식 오류 — 예: 09:00")
            self.settings["schedule_enabled"] = False
            enabled = False
        save_settings(self.settings)
        self.log("설정을 저장했습니다.")
        need_restart = (
            enabled != prev_enabled
            or hhmm != prev_time
            or (enabled and not (self._scheduler and self._scheduler.is_alive()))
        )
        if need_restart:
            if enabled and not prev_enabled:
                self._mark_today_done_if_past()
            elif enabled and hhmm != prev_time:
                self._maybe_clear_skip_for_new_time(hhmm)
            self.restart_scheduler()

    def build_queue(self) -> Dict[str, Any]:
        try:
            total = int(str(self.settings.get("total_target") or "0"))
            daily = int(str(self.settings.get("daily_limit") or "50"))
        except ValueError as e:
            raise ValueError("총 목표·하루 발행 수는 숫자여야 합니다.") from e
        kws = parse_lines(str(self.settings.get("keywords_text") or ""))
        regs = parse_lines(str(self.settings.get("regions_text") or ""))
        mode = self.settings.get("order_mode") or "random"
        if mode not in ("random", "sequential"):
            mode = "random"
        self.queue = fill_queue(kws, regs, total, daily, mode)  # type: ignore[arg-type]
        save_queue(queue_path(), self.queue)
        save_settings(self.settings)
        self.log(
            f"큐 생성: {self.queue.remaining}건 (키워드 {len(kws)} · 지역 {len(regs)} · {mode})"
        )
        return {
            "ok": True,
            "remaining": self.queue.remaining,
            "days_left": self.queue.days_left,
            "summary": self.queue_summary(),
        }

    def request_stop(self) -> None:
        self.stop_requested = True
        self.status = "중지 요청됨… (곧 중단)"
        self.log("중지 요청 — 생성·업로드·대기·로그인 중이면 바로 끊고 중단합니다.")

    def start_batch(self, *, from_schedule: bool = False) -> bool:
        """배치 시작. 실제로 큐에서 꺼내 시작했으면 True."""
        with self._lock:
            if self.running:
                self.log("이미 작업 중입니다.")
                return False
            if not self.queue or not self.queue.pending:
                self.log("발행 큐가 비어 있습니다. 먼저 큐를 만드세요.")
                return False
            try:
                self.queue.daily_limit = max(
                    1, int(str(self.settings.get("daily_limit") or "50"))
                )
            except ValueError:
                pass
            kws = dequeue(self.queue, self.queue.daily_limit)
            if not kws:
                self.log("발행할 항목이 없습니다.")
                return False
            save_queue(queue_path(), self.queue)
            self.running = True
            self.stop_requested = False
            self.status = f"발행 중… {len(kws)}건"
            self.log(f"배치 시작: {len(kws)}건" + (" (스케줄)" if from_schedule else ""))

        def worker() -> None:
            stopped = False
            try:
                urls = self._publish(kws)
                self.last_urls = urls
                if self.stop_requested:
                    stopped = True
                    self.log(
                        f"중지됨 · 처리 {len(urls)}건 · 큐 남음 {self.queue.remaining if self.queue else 0}"
                    )
                else:
                    self.log(
                        f"배치 완료: {len(urls)}건 · 큐 남음 {self.queue.remaining if self.queue else 0}"
                    )
            except Exception as e:
                self.log(f"오류: {e}")
            finally:
                self.running = False
                self.status = "중지됨" if stopped or self.stop_requested else "대기 중"
                save_settings(self.settings)
                if self.queue:
                    save_queue(queue_path(), self.queue)

        threading.Thread(target=worker, daemon=True).start()
        return True

    def _stopped(self) -> bool:
        return bool(self.stop_requested)

    def _publish(self, kws: List[str]) -> List[str]:
        site = (self.settings.get("site_url") or DEFAULT_SITE_URL).strip()
        out = (self.settings.get("out_dir") or os.path.join(webdoc_dir(), "output")).strip()
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        folder = os.path.join(out, f"webdoc_purme_{stamp}")
        root = project_root()
        if os.path.isfile(os.path.join(root, "package.json")):
            sync = os.path.join(root, "public", "seo-data")
        else:
            sync = os.path.join(webdoc_dir(), "seo-data")

        tok = (self.settings.get("blob_token") or "").strip()
        if tok:
            os.environ["BLOB_READ_WRITE_TOKEN"] = tok

        if self._stopped():
            self.log("중지됨 — 생성 시작 전 중단")
            return []

        self.log(f"생성 중… {folder}")
        urls = generate_batch(
            kws, folder, site, sync, stop_requested=self._stopped
        )
        if self._stopped():
            self.log(f"중지됨 — 생성 {len(urls)}건에서 중단")
            return urls

        self.log(f"로컬 동기화: {sync}")
        self.log("웹(Blob) 업로드 시작 (ASCII 키)…")

        blob_ok, blob_msg = sync_pages_dir_to_blob(
            os.path.join(folder, "pages"), stop_requested=self._stopped
        )
        self.log(f"웹(Blob): {blob_msg}")
        if self._stopped():
            self.log("중지됨 — Blob 이후 단계 생략")
            return urls

        if self.settings.get("do_indexnow", True) and urls:
            _ok, msg = submit_indexnow(site, urls)
            self.log(f"IndexNow: {msg}")

        if self._stopped():
            self.log("중지됨 — 블로그 등록·브라우저 열기 생략")
            return urls

        if self.settings.get("auto_naver_register", True) and urls:
            self.log("발행 후 인포씨 작업요청 시작…")
            self._run_naver_register(urls)

        if self._stopped():
            self.log("중지됨")
            return urls

        if self.settings.get("open_chrome_after", True) and urls:
            self.log(open_urls_in_chrome(urls, limit=min(3, len(urls))))

        return urls

    def _run_naver_register(self, urls: List[str]) -> None:
        site = (self.settings.get("site_url") or DEFAULT_SITE_URL).strip()
        try:
            daily = int(str(self.settings.get("naver_daily_limit") or "50"))
            dmin = float(str(self.settings.get("naver_delay_min") or "3"))
            dmax = float(str(self.settings.get("naver_delay_max") or "8"))
        except ValueError:
            daily, dmin, dmax = 50, 3.0, 8.0
        self.log_naver(f"블로그 등록 시작… {len(urls)}건 (로그인 실패 시 Chrome 재시작×3)")
        _ok, msg = register_urls(
            urls,
            naver_id=str(self.settings.get("naver_id") or ""),
            naver_password=str(self.settings.get("naver_password") or ""),
            naver_site=str(self.settings.get("naver_site") or site),
            daily_limit=max(1, daily),
            delay_min=dmin,
            delay_max=dmax,
            twocaptcha_api_key=str(self.settings.get("twocaptcha_api_key") or ""),
            on_log=self.log_naver,
            stop_requested=lambda: self.stop_requested,
            login_retries=3,
        )
        self.log_naver(msg)
        self.log(msg)

    def start_naver_pending(self) -> None:
        """오늘(누적) 미등록 URL만 블로그 수집 요청 — 수동 재시도용."""
        with self._lock:
            if self.running:
                self.log("이미 작업 중입니다.")
                return
            try:
                urls = pending_urls()
            except Exception as e:
                self.log(f"미등록 URL 조회 실패: {e}")
                return
            if not urls:
                self.log("미등록 블로그가 없습니다. (urls.txt 기준 모두 등록 완료)")
                return
            self.running = True
            self.stop_requested = False
            self.status = f"블로그 등록 중… {len(urls)}건"
            self.log(f"오늘 미등록 블로그 등록 요청: {len(urls)}건")

        def worker() -> None:
            try:
                self.last_urls = urls
                self._run_naver_register(urls)
            except Exception as e:
                self.log(f"오류: {e}")
            finally:
                self.running = False
                self.status = "대기 중"

        threading.Thread(target=worker, daemon=True).start()

    def set_schedule_enabled(
        self, enabled: bool, hhmm: str, *, from_settings_save: bool = False
    ) -> None:
        if enabled and not parse_hhmm(hhmm):
            raise ValueError("시각은 HH:MM 형식이어야 합니다. 예: 09:00")
        was = bool(self.settings.get("schedule_enabled"))
        prev_time = str(self.settings.get("schedule_time") or "")
        self.settings["schedule_enabled"] = enabled
        self.settings["schedule_time"] = hhmm
        if enabled and not was:
            self._mark_today_done_if_past()
        elif enabled and was and hhmm != prev_time:
            self._maybe_clear_skip_for_new_time(hhmm)
            parsed = parse_hhmm(hhmm)
            if parsed:
                self.log(
                    f"스케줄 시각 변경 → 매일 {parsed[0]:02d}:{parsed[1]:02d}"
                )
        elif enabled and was:
            parsed = parse_hhmm(hhmm)
            last = str(self.settings.get("schedule_last_run_date") or "")
            if parsed:
                h, m = parsed
                self.log(
                    f"스케줄 적용 — 매일 {h:02d}:{m:02d} · 마지막 {last or '—'} "
                    f"· 프로그램이 실행 중이어야 자동 발행됩니다."
                )
        else:
            self.log("스케줄 OFF")
        self.restart_scheduler()
        save_settings(self.settings)

    def _maybe_clear_skip_for_new_time(self, hhmm: str) -> None:
        """아직 안 지난 시각으로 바꾸면, 오늘 '건너뜀' 표시를 해제해 당일 예약 가능하게."""
        parsed = parse_hhmm(hhmm)
        if not parsed:
            return
        now = datetime.now()
        today = date.today().isoformat()
        if self.settings.get("schedule_last_run_date") != today:
            return
        hour, minute = parsed
        if (now.hour, now.minute) < (hour, minute):
            self.settings["schedule_last_run_date"] = ""
            if self.queue:
                self.queue.last_run_date = ""
                save_queue(queue_path(), self.queue)
            self.log(
                f"새 시각 {hour:02d}:{minute:02d}은 아직 남음 → 오늘 자동 발행을 다시 예약합니다."
            )

    def _mark_today_done_if_past(self) -> None:
        """지정 시각이 이미 지났으면 즉시 폭주 방지를 위해 오늘을 건너뜀.

        (켜는 순간 어제 시각 조건으로 바로 발행되는 것을 막음)
        오늘 분이 필요하면 [오늘 배치 지금 실행] 버튼을 쓰면 됨.
        """
        parsed = parse_hhmm(str(self.settings.get("schedule_time") or ""))
        if not parsed:
            return
        now = datetime.now()
        today = date.today().isoformat()
        last = str(self.settings.get("schedule_last_run_date") or "")
        if last == today:
            self.log(
                f"스케줄 ON — 오늘은 이미 처리됨(마지막 {last}). "
                f"다음 자동 발행은 내일 {parsed[0]:02d}:{parsed[1]:02d}."
            )
            return
        hour, minute = parsed
        if (now.hour, now.minute) >= (hour, minute):
            self.settings["schedule_last_run_date"] = today
            if self.queue:
                self.queue.last_run_date = today
                save_queue(queue_path(), self.queue)
            self.log(
                f"스케줄 ON — 지금({now.strftime('%H:%M')})은 이미 "
                f"{hour:02d}:{minute:02d}이 지나 "
                f"오늘은 자동 발행을 건너뜁니다. "
                f"내일 {hour:02d}:{minute:02d}에 자동 실행 "
                f"(오늘 분이 필요하면 [오늘 배치 지금 실행])."
            )
        else:
            self.log(
                f"스케줄 ON — 오늘 {hour:02d}:{minute:02d}에 자동 발행 예정입니다. "
                f"(프로그램이 그 시각에 켜져 있어야 함)"
            )

    def restart_scheduler(self) -> None:
        if self._scheduler:
            self._scheduler.stop()
            self._scheduler = None
        if not self.settings.get("schedule_enabled"):
            self.schedule_status = "스케줄: 꺼짐"
            return
        self._scheduler = DailyScheduler(
            get_enabled=lambda: bool(self.settings.get("schedule_enabled")),
            get_hhmm=lambda: str(self.settings.get("schedule_time") or "09:00"),
            get_last_run_date=lambda: str(
                self.settings.get("schedule_last_run_date") or ""
            ),
            set_last_run_date=self._set_last_run_date,
            on_fire=lambda: self.start_batch(from_schedule=True),
            on_log=self.log,
            on_status=lambda s: setattr(self, "schedule_status", s),
        )
        self._scheduler.start()

    def _set_last_run_date(self, value: str) -> None:
        self.settings["schedule_last_run_date"] = value
        if self.queue:
            self.queue.last_run_date = value
            save_queue(queue_path(), self.queue)
        save_settings(self.settings)

    def request_quit(self) -> None:
        self.quit_requested = True
        self.stop_requested = True
        self.log("프로그램 종료 요청…")
        self.shutdown()

    def shutdown(self) -> None:
        self.stop_requested = True
        if self._scheduler:
            self._scheduler.stop()
            self._scheduler = None
        save_settings(self.settings)
        if self.queue:
            save_queue(queue_path(), self.queue)


RUNTIME = WebdocRuntime()

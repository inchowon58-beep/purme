# -*- coding: utf-8 -*-
"""매일 지정 시각에 콜백을 실행하는 스케줄러 (프로그램 실행 중)."""

from __future__ import annotations

import threading
from datetime import datetime, timedelta
from typing import Callable

LogFn = Callable[[str], None] | None


def parse_hhmm(value: str) -> tuple[int, int] | None:
    text = (value or "").strip()
    if not text:
        return None
    try:
        parts = text.replace("：", ":").split(":")
        hour = int(parts[0])
        minute = int(parts[1]) if len(parts) > 1 else 0
        if 0 <= hour <= 23 and 0 <= minute <= 59:
            return hour, minute
    except (TypeError, ValueError, IndexError):
        return None
    return None


def format_hhmm(hour: int, minute: int) -> str:
    return f"{hour:02d}:{minute:02d}"


def next_run_datetime(
    hour: int,
    minute: int,
    *,
    last_run_date: str = "",
    now: datetime | None = None,
) -> datetime:
    """다음 실행 시각. 오늘 이미 실행(또는 건너뜀)이면 내일."""
    now = now or datetime.now()
    today = now.date().isoformat()
    candidate = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if last_run_date == today or candidate <= now:
        candidate = candidate + timedelta(days=1)
        # 날짜가 바뀐 뒤에도 last_run 과 같으면 한 번 더
        if candidate.date().isoformat() == last_run_date:
            candidate = candidate + timedelta(days=1)
    return candidate


class DailyScheduler:
    """프로그램 실행 중 매일 한 번, 지정 시각에 on_fire 호출.

    on_fire 는 True(실행함) / False(스킵·실패·큐없음) 를 반환해야 한다.
    False 이면 오늘을 '완료'로 표시하지 않아 이후 폴링에서 재시도한다.
    """

    def __init__(
        self,
        *,
        get_enabled: Callable[[], bool],
        get_hhmm: Callable[[], str],
        get_last_run_date: Callable[[], str],
        set_last_run_date: Callable[[str], None],
        on_fire: Callable[[], bool],
        on_log: LogFn = None,
        on_status: Callable[[str], None] | None = None,
        poll_sec: float = 15.0,
    ) -> None:
        self._get_enabled = get_enabled
        self._get_hhmm = get_hhmm
        self._get_last_run_date = get_last_run_date
        self._set_last_run_date = set_last_run_date
        self._on_fire = on_fire
        self._on_log = on_log
        self._on_status = on_status
        self._poll_sec = max(5.0, float(poll_sec))
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._lock = threading.Lock()
        self._firing = False

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(
            target=self._loop, name="WebdocDailyScheduler", daemon=True
        )
        self._thread.start()
        self._emit_status()

    def stop(self) -> None:
        self._stop.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2.0)
        self._thread = None

    def is_alive(self) -> bool:
        return bool(self._thread and self._thread.is_alive())

    def _log(self, msg: str) -> None:
        if self._on_log:
            self._on_log(msg)

    def _emit_status(self) -> None:
        if not self._on_status:
            return
        if not self._get_enabled():
            self._on_status("스케줄: 꺼짐")
            return
        if not self.is_alive() and self._thread is None:
            # start 직전/중지 직후
            pass
        parsed = parse_hhmm(self._get_hhmm())
        if not parsed:
            self._on_status("스케줄: 시각 형식 오류 (예: 09:00)")
            return
        hour, minute = parsed
        last = self._get_last_run_date() or "—"
        nxt = next_run_datetime(hour, minute, last_run_date=self._get_last_run_date() or "")
        alive = "동작중" if self.is_alive() else "중지됨"
        self._on_status(
            f"스케줄: 매일 {format_hhmm(hour, minute)} · 다음 {nxt.strftime('%m-%d %H:%M')} "
            f"· 마지막 {last} · {alive}"
        )

    def _should_fire(self, now: datetime) -> bool:
        if not self._get_enabled():
            return False
        parsed = parse_hhmm(self._get_hhmm())
        if not parsed:
            return False
        hour, minute = parsed
        if (now.hour, now.minute) < (hour, minute):
            return False
        today = now.date().isoformat()
        if self._get_last_run_date() == today:
            return False
        return True

    def _loop(self) -> None:
        self._log(
            "스케줄러 시작 — 프로그램이 실행 중인 동안 매일 지정 시각에 자동 발행합니다."
        )
        while not self._stop.is_set():
            try:
                self._emit_status()
                now = datetime.now()
                if self._should_fire(now):
                    with self._lock:
                        if self._firing:
                            pass
                        else:
                            self._firing = True
                            self._log(
                                f"스케줄 시각 도달 ({now.strftime('%Y-%m-%d %H:%M')}) — 오늘 배치 시도"
                            )
                            started = False
                            try:
                                started = bool(self._on_fire())
                            except Exception as exc:
                                self._log(f"스케줄 실행 오류: {exc}")
                                started = False
                            finally:
                                if started:
                                    today = now.date().isoformat()
                                    self._set_last_run_date(today)
                                    self._log(f"스케줄 발행 시작 확정 · 오늘({today}) 완료 표시")
                                else:
                                    self._log(
                                        "스케줄 배치를 시작하지 못함 — "
                                        "큐/작업상태 확인 후 잠시 뒤 재시도합니다."
                                    )
                                self._firing = False
                                self._emit_status()
            except Exception as exc:
                self._log(f"스케줄러 오류: {exc}")
            self._stop.wait(self._poll_sec)
        self._log("스케줄러 중지")

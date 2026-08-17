"""네이버 자동입력 방지(CAPTCHA) — 2Captcha API."""

from __future__ import annotations

import base64
import logging
import re
import time
from typing import Callable

import requests

logger = logging.getLogger(__name__)

LogFn = Callable[[str], None] | None

MIN_CAPTCHA_LEN = 5
MAX_CAPTCHA_LEN = 6

CAPTCHA_DIALOG_KEYWORDS = (
    "자동입력",
    "보안",
    "captcha",
    "보안코드",
    "보안절차",
    "보안 절차",
    "anti-spam",
    "anti spam",
)


def _emit(msg: str, on_log: LogFn) -> None:
    logger.info(msg)
    if on_log:
        on_log(msg)


def _normalize_captcha_code(raw: str) -> str:
    return re.sub(r"[^a-zA-Z0-9]", "", (raw or "")).strip()


def _valid_captcha_code(code: str) -> bool:
    length = len(code)
    return 4 <= length <= 8


def _driver_alive(driver) -> bool:
    if driver is None:
        return False
    try:
        _ = driver.current_url
        return True
    except Exception:
        return False


def _reportbad_2captcha(api_key: str, task_id: str) -> None:
    try:
        requests.get(
            "https://2captcha.com/res.php",
            params={"key": api_key, "action": "reportbad", "id": task_id},
            timeout=15,
        )
    except Exception:
        pass


_last_2captcha_task_id: str | None = None


def get_last_2captcha_task_id() -> str | None:
    return _last_2captcha_task_id


def report_last_2captcha_bad(api_key: str) -> None:
    global _last_2captcha_task_id
    if _last_2captcha_task_id and api_key.strip():
        _reportbad_2captcha(api_key.strip(), _last_2captcha_task_id)
        _last_2captcha_task_id = None


def _submit_2captcha_task(
    image_bytes: bytes,
    api_key: str,
    *,
    image_url: str = "",
    on_log: LogFn = None,
) -> str:
    """posting_help 와 동일: plain text API, 최소 파라미터."""
    global _last_2captcha_task_id
    key = api_key.strip()

    if image_url.startswith("http"):
        _emit(f"  2Captcha URL 방식 시도: {image_url[:80]}…", on_log)
        response = requests.post(
            "https://2captcha.com/in.php",
            data={"key": key, "method": "url", "url": image_url},
            timeout=30,
        )
        result = response.text.strip()
        if result.startswith("OK|"):
            _last_2captcha_task_id = result.split("|", 1)[1]
            return _last_2captcha_task_id
        _emit(f"  2Captcha URL 제출 실패: {result}", on_log)

    body = base64.b64encode(image_bytes).decode("ascii")
    _emit(f"  2Captcha base64 전송 ({len(image_bytes)} bytes)", on_log)
    response = requests.post(
        "https://2captcha.com/in.php",
        data={"key": key, "method": "base64", "body": body},
        timeout=30,
    )
    result = response.text.strip()
    if result.startswith("OK|"):
        _last_2captcha_task_id = result.split("|", 1)[1]
        return _last_2captcha_task_id
    raise RuntimeError(f"2Captcha 제출 실패: {result}")


def _poll_2captcha_task(
    api_key: str,
    task_id: str,
    *,
    on_log: LogFn = None,
    poll_interval: float = 5.0,
    timeout: float = 120.0,
    driver=None,
) -> str:
    deadline = time.time() + timeout
    while time.time() < deadline:
        if driver is not None and not _driver_alive(driver):
            raise RuntimeError("브라우저 세션이 종료되었습니다 (CAPTCHA 대기 중)")
        time.sleep(poll_interval)
        response = requests.get(
            "https://2captcha.com/res.php",
            params={"key": api_key, "action": "get", "id": task_id},
            timeout=30,
        )
        result = response.text.strip()
        if result.startswith("OK|"):
            code = _normalize_captcha_code(result.split("|", 1)[1])
            if _valid_captcha_code(code):
                return code
            raise RuntimeError(f"2Captcha 결과 형식 오류: {result}")
        if result == "CAPCHA_NOT_READY":
            continue
        raise RuntimeError(f"2Captcha 오류: {result}")
    raise RuntimeError("2Captcha 응답 시간 초과")


def read_captcha_via_2captcha(
    image_bytes: bytes,
    api_key: str,
    *,
    image_url: str = "",
    on_log: LogFn = None,
    poll_interval: float = 5.0,
    timeout: float = 120.0,
    max_submit_attempts: int = 3,
    driver=None,
) -> str:
    """2Captcha ImageToText API로 보안코드 인식 (posting_help 방식)."""
    key = api_key.strip()
    if not key:
        raise ValueError("2Captcha API 키가 필요합니다.")
    if not image_bytes and not image_url:
        raise ValueError("CAPTCHA 이미지가 비어 있습니다.")
    if image_bytes and len(image_bytes) < 100:
        raise ValueError(f"CAPTCHA 이미지가 너무 작습니다 ({len(image_bytes)} bytes)")

    last_error: Exception | None = None
    for attempt in range(max_submit_attempts):
        if attempt > 0:
            _emit(f"  2Captcha 재전송 ({attempt + 1}/{max_submit_attempts})", on_log)
        if driver is not None and not _driver_alive(driver):
            raise RuntimeError("브라우저 세션이 종료되었습니다 (CAPTCHA 전송 전)")

        _emit("  2Captcha에 이미지 전송 중…", on_log)
        task_id = None
        try:
            task_id = _submit_2captcha_task(
                image_bytes,
                key,
                image_url=image_url,
                on_log=on_log,
            )
            _emit(f"  2Captcha 작업 대기 (id={task_id})…", on_log)
            code = _poll_2captcha_task(
                key,
                task_id,
                on_log=on_log,
                poll_interval=poll_interval,
                timeout=timeout,
                driver=driver,
            )
            _emit(f"  2Captcha 인식 완료: {code}", on_log)
            return code
        except RuntimeError as exc:
            last_error = exc
            err = str(exc)
            _emit(f"  2Captcha 시도 실패: {err}", on_log)
            if task_id and "형식 오류" in err:
                _reportbad_2captcha(key, task_id)
            if attempt + 1 < max_submit_attempts:
                time.sleep(2.0)
                continue
            raise
        except Exception as exc:
            last_error = exc
            raise

    raise RuntimeError(f"2Captcha 인식 실패: {last_error}")


def read_captcha_code(
    image_bytes: bytes,
    *,
    twocaptcha_api_key: str = "",
    image_url: str = "",
    on_log: LogFn = None,
    driver=None,
) -> str:
    """2Captcha로 보안코드 인식."""
    if not twocaptcha_api_key.strip():
        raise ValueError("2Captcha API 키가 필요합니다.")
    return read_captcha_via_2captcha(
        image_bytes,
        twocaptcha_api_key,
        image_url=image_url,
        on_log=on_log,
        driver=driver,
    )


def has_captcha_solver(twocaptcha_api_key: str = "") -> bool:
    return bool(twocaptcha_api_key.strip())


def _dialog_has_captcha_keywords(text: str) -> bool:
    lower = (text or "").lower()
    return any(w.lower() in lower for w in CAPTCHA_DIALOG_KEYWORDS)


def _scope_has_captcha_image(scope) -> bool:
    from selenium.webdriver.common.by import By

    try:
        for canvas in scope.find_elements(By.TAG_NAME, "canvas"):
            if not canvas.is_displayed():
                continue
            w = canvas.size.get("width", 0)
            h = canvas.size.get("height", 0)
            if w >= 60 and h >= 24:
                return True
        for img in scope.find_elements(By.TAG_NAME, "img"):
            if not img.is_displayed():
                continue
            src = (img.get_attribute("src") or "").lower()
            alt = (img.get_attribute("alt") or "").lower()
            w = img.size.get("width", 0)
            h = img.size.get("height", 0)
            if w >= 60 and h >= 24 and (
                "captcha" in src or "보안" in alt or "자동" in alt
            ):
                return True
            if w >= 80 and h >= 30 and "audio" not in src:
                return True
    except Exception:
        pass
    return False


def _find_captcha_dialog(driver):
    from selenium.webdriver.common.by import By

    selectors = (
        "[role='dialog']",
        ".v-dialog",
        ".v-dialog__content",
        ".v-overlay__content",
        ".modal",
    )
    for root_sel in selectors:
        for root in driver.find_elements(By.CSS_SELECTOR, root_sel):
            try:
                if not root.is_displayed():
                    continue
                text = root.text or ""
                if _dialog_has_captcha_keywords(text):
                    return root
            except Exception:
                continue

    for root_sel in selectors:
        for root in driver.find_elements(By.CSS_SELECTOR, root_sel):
            try:
                if not root.is_displayed():
                    continue
                text = root.text or ""
                if len(text) > 600:
                    continue
                has_input = False
                for el in root.find_elements(
                    By.CSS_SELECTOR,
                    "input[type='text'], input:not([type='hidden'])",
                ):
                    if el.is_displayed() and el.is_enabled():
                        has_input = True
                        break
                if has_input and _scope_has_captcha_image(root):
                    return root
            except Exception:
                continue
    return None


def _element_box_size(driver, el) -> tuple[float, float]:
    try:
        rect = driver.execute_script(
            """
            const r = arguments[0].getBoundingClientRect();
            return [r.width, r.height];
            """,
            el,
        )
        if rect and len(rect) >= 2:
            return float(rect[0]), float(rect[1])
    except Exception:
        pass
    try:
        size = el.size or {}
        return float(size.get("width", 0)), float(size.get("height", 0))
    except Exception:
        return 0.0, 0.0


def _js_find_captcha_element(driver, root=None):
    """JS로 canvas/img/배경이미지 div 탐색 (size 0 캔버스 포함)."""
    try:
        return driver.execute_script(
            """
            const scopes = [];
            if (arguments[0]) scopes.push(arguments[0]);
            else scopes.push(document);

            const visible = (el) => {
                if (!el) return false;
                const st = window.getComputedStyle(el);
                if (st.display === 'none' || st.visibility === 'hidden' || st.opacity === '0') {
                    return false;
                }
                const r = el.getBoundingClientRect();
                return r.width >= 20 && r.height >= 12;
            };

            const scoreImg = (el) => {
                const r = el.getBoundingClientRect();
                const src = (el.src || '').toLowerCase();
                const alt = (el.alt || '').toLowerCase();
                let score = r.width * r.height;
                if (src.includes('captcha')) score += 5000;
                if (src.includes('security')) score += 3000;
                if (alt.includes('보안') || alt.includes('자동')) score += 2000;
                if (src.includes('audio')) score -= 10000;
                return score;
            };

            let best = null;
            let bestScore = -1;
            for (const scope of scopes) {
                for (const c of scope.querySelectorAll('canvas')) {
                    if (!visible(c)) continue;
                    const s = c.getBoundingClientRect().width * c.getBoundingClientRect().height;
                    if (s > bestScore) { best = c; bestScore = s; }
                }
                for (const img of scope.querySelectorAll('img')) {
                    if (!visible(img)) continue;
                    const s = scoreImg(img);
                    if (s > bestScore) { best = img; bestScore = s; }
                }
                for (const el of scope.querySelectorAll('div, span, svg')) {
                    if (!visible(el)) continue;
                    const bg = window.getComputedStyle(el).backgroundImage || '';
                    if (bg && bg !== 'none') {
                        const r = el.getBoundingClientRect();
                        const s = r.width * r.height + 1000;
                        if (s > bestScore) { best = el; bestScore = s; }
                    }
                }
            }
            return best;
            """,
            root,
        )
    except Exception:
        return None


def _find_captcha_image_near_input(driver, inp):
    from selenium.webdriver.common.by import By

    try:
        el = driver.execute_script(
            """
            const inp = arguments[0];
            let node = inp.parentElement;
            for (let i = 0; i < 8 && node; i++) {
                for (const sel of ['canvas', 'img']) {
                    for (const c of node.querySelectorAll(sel)) {
                        const r = c.getBoundingClientRect();
                        if (r.width >= 20 && r.height >= 12) return c;
                    }
                }
                node = node.parentElement;
            }
            return null;
            """,
            inp,
        )
        if el:
            return el
    except Exception:
        pass

    try:
        container = inp.find_element(By.XPATH, "./ancestor::*[1]")
        for tag in ("canvas", "img"):
            for el in container.find_elements(By.TAG_NAME, tag):
                w, h = _element_box_size(driver, el)
                if w >= 20 and h >= 12:
                    return el
    except Exception:
        pass
    return None


def _find_captcha_image(driver):
    from selenium.webdriver.common.by import By

    dialog = _find_captcha_dialog(driver)
    scopes: list = []
    if dialog:
        scopes.append(dialog)
    scopes.append(driver)

    for scope in scopes:
        el = _js_find_captcha_element(driver, scope)
        if el:
            return el

    inp = _find_captcha_input(driver)
    if inp:
        near = _find_captcha_image_near_input(driver, inp)
        if near:
            return near

    for scope in scopes:
        for canvas in scope.find_elements(By.TAG_NAME, "canvas"):
            try:
                w, h = _element_box_size(driver, canvas)
                if w >= 20 and h >= 12:
                    return canvas
            except Exception:
                continue

    selectors = (
        "img[src*='captcha']",
        "img[src*='Captcha']",
        "img[src*='security']",
        "img[alt*='자동']",
        "img[alt*='보안']",
        "[role='dialog'] img",
        ".v-dialog img",
        ".v-overlay__content img",
    )
    candidates = []
    for scope in scopes:
        for sel in selectors:
            for img in scope.find_elements(By.CSS_SELECTOR, sel):
                try:
                    w, h = _element_box_size(driver, img)
                    if w >= 20 and h >= 12:
                        candidates.append((w * h, img))
                except Exception:
                    continue
    if candidates:
        candidates.sort(key=lambda x: x[0], reverse=True)
        return candidates[0][1]

    for scope in scopes:
        for img in scope.find_elements(By.TAG_NAME, "img"):
            try:
                src = (img.get_attribute("src") or "").lower()
                if "captcha" in src and "audio" not in src:
                    w, h = _element_box_size(driver, img)
                    if w >= 10 and h >= 10:
                        return img
            except Exception:
                continue

    driver.switch_to.default_content()
    for frame in driver.find_elements(By.TAG_NAME, "iframe"):
        try:
            if not frame.is_displayed():
                continue
            driver.switch_to.frame(frame)
            el = _js_find_captcha_element(driver, None)
            if el:
                return el
            inp = _find_captcha_input(driver)
            if inp:
                near = _find_captcha_image_near_input(driver, inp)
                if near:
                    return near
        except Exception:
            pass
        finally:
            try:
                driver.switch_to.default_content()
            except Exception:
                pass
    return None


def _bytes_from_element(driver, el, *, on_log: LogFn = None) -> tuple[bytes, str]:
    tag = (el.tag_name or "").lower()

    if tag == "img":
        src = (el.get_attribute("src") or "").strip()
        if src.startswith("data:image"):
            try:
                data = base64.b64decode(src.split(",", 1)[1])
                if len(data) >= 100:
                    _emit(f"  CAPTCHA data-uri 이미지 ({len(data)} bytes)", on_log)
                    return data, ""
            except Exception:
                pass
        if src.startswith("http"):
            try:
                cookies = {c["name"]: c["value"] for c in driver.get_cookies()}
                headers = {
                    "User-Agent": driver.execute_script("return navigator.userAgent;"),
                    "Referer": driver.current_url or "https://searchadvisor.naver.com/",
                    "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
                }
                resp = requests.get(src, headers=headers, cookies=cookies, timeout=15)
                resp.raise_for_status()
                if resp.content and len(resp.content) >= 100:
                    _emit(
                        f"  CAPTCHA 이미지 URL 다운로드 ({len(resp.content)} bytes)",
                        on_log,
                    )
                    return resp.content, src
            except Exception as exc:
                _emit(f"  CAPTCHA URL 다운로드 실패: {exc}", on_log)

    if tag == "canvas":
        try:
            data_url = driver.execute_script(
                "return arguments[0].toDataURL('image/png');", el
            )
            if data_url and "," in data_url:
                data = base64.b64decode(data_url.split(",", 1)[1])
                if len(data) >= 100:
                    _emit(f"  CAPTCHA canvas 캡처 ({len(data)} bytes)", on_log)
                    return data, ""
        except Exception as exc:
            _emit(f"  CAPTCHA canvas 캡처 실패: {exc}", on_log)

    png = el.screenshot_as_png
    if png and len(png) >= 100:
        _emit(f"  CAPTCHA 요소 스크린샷 ({len(png)} bytes)", on_log)
        return png, ""

    raise ValueError("요소에서 CAPTCHA 이미지를 읽을 수 없습니다.")


def _capture_captcha_bytes(driver, *, on_log: LogFn = None) -> tuple[bytes, str]:
    """CAPTCHA 이미지 캡처 — 요소 탐색 후 URL/스크린샷, 실패 시 다이얼로그 캡처."""
    time.sleep(1.0)
    img = _find_captcha_image(driver)
    if img:
        try:
            return _bytes_from_element(driver, img, on_log=on_log)
        except ValueError as exc:
            _emit(f"  CAPTCHA 요소 캡처 실패: {exc}", on_log)

    dialog = _find_captcha_dialog(driver)
    if dialog:
        png = dialog.screenshot_as_png
        if png and len(png) >= 500:
            _emit(f"  CAPTCHA 다이얼로그 스크린샷 ({len(png)} bytes)", on_log)
            return png, ""

    raise ValueError("CAPTCHA 이미지/캔버스를 찾지 못했습니다.")


def _find_captcha_input(driver):
    from selenium.webdriver.common.by import By

    dialog = _find_captcha_dialog(driver)
    scopes: list = []
    if dialog:
        scopes.append(dialog)
    scopes.extend(
        driver.find_elements(By.CSS_SELECTOR, "[role='dialog'], .v-dialog, .v-dialog__content")
    )
    for scope in scopes:
        try:
            for el in scope.find_elements(
                By.CSS_SELECTOR,
                "input[type='text'], input:not([type='hidden']), textarea",
            ):
                if not el.is_displayed() or not el.is_enabled():
                    continue
                placeholder = (el.get_attribute("placeholder") or "").lower()
                aria = (el.get_attribute("aria-label") or "").lower()
                name = (el.get_attribute("name") or "").lower()
                if any(w in placeholder + aria + name for w in ("보안", "captcha", "코드", "자동")):
                    return el
                if dialog is not None:
                    return el
        except Exception:
            continue
    return None


def _click_dialog_confirm(driver, root, *, on_log: LogFn = None) -> bool:
    from selenium.webdriver.common.by import By

    for btn in root.find_elements(By.CSS_SELECTOR, "button.accent, button.v-btn.accent, button[type='submit']"):
        try:
            if btn.is_displayed() and btn.is_enabled() and "취소" not in (btn.text or ""):
                btn.click()
                return True
        except Exception:
            try:
                driver.execute_script("arguments[0].click();", btn)
                return True
            except Exception:
                continue

    for btn in root.find_elements(By.XPATH, ".//button[contains(.,'확인')]"):
        try:
            label = (btn.text or "").strip()
            if "취소" in label:
                continue
            if btn.is_displayed() and btn.is_enabled():
                btn.click()
                return True
        except Exception:
            try:
                driver.execute_script("arguments[0].click();", btn)
                return True
            except Exception:
                continue
    return False


def refresh_captcha_image(driver, *, on_log: LogFn = None) -> bool:
    """보안코드 이미지 새로고침 버튼 클릭."""
    from selenium.webdriver.common.by import By

    dialog = _find_captcha_dialog(driver)
    scopes: list = [driver]
    if dialog:
        scopes.insert(0, dialog)

    labels = ("새로고침", "다른", "재생성", "refresh", "다시", "변경")
    selectors = (
        "button[aria-label*='새로고침']",
        "button[aria-label*='refresh']",
        "button[aria-label*='Refresh']",
        "[class*='refresh']",
        "[class*='captcha'] button",
    )
    for scope in scopes:
        for sel in selectors:
            for el in scope.find_elements(By.CSS_SELECTOR, sel):
                try:
                    if el.is_displayed():
                        el.click()
                        _emit("  CAPTCHA 이미지 새로고침", on_log)
                        time.sleep(2.0)
                        return True
                except Exception:
                    try:
                        driver.execute_script("arguments[0].click();", el)
                        time.sleep(2.0)
                        return True
                    except Exception:
                        continue
    for scope in scopes:
        for label in labels:
            for el in scope.find_elements(
                By.XPATH,
                f".//button[contains(.,'{label}')] | .//a[contains(.,'{label}')] | .//*[@title[contains(.,'{label}')]]",
            ):
                try:
                    if el.is_displayed():
                        el.click()
                        _emit("  CAPTCHA 이미지 새로고침", on_log)
                        time.sleep(2.0)
                        return True
                except Exception:
                    try:
                        driver.execute_script("arguments[0].click();", el)
                        time.sleep(2.0)
                        return True
                    except Exception:
                        continue
    return False


def _wait_for_captcha_modal(
    driver, *, timeout: float = 15.0, on_log: LogFn = None
) -> bool:
    """검증 실패 후 보안절차 모달이 다시 뜰 때까지 대기."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        accept_security_alert_if_present(driver, on_log=on_log)
        if captcha_modal_visible(driver):
            return True
        time.sleep(0.4)
    return False


def accept_security_alert_if_present(driver, *, on_log: LogFn = None) -> str | None:
    """보안절차 실패 alert 가 있으면 확인(닫기) 후 문구 반환."""
    try:
        alert = driver.switch_to.alert
        text = alert.text or ""
        alert.accept()
        _emit(f"  alert 확인: {text}", on_log)
        return text
    except Exception:
        return None


_OWNERSHIP_FAIL_ALERT_WORDS = (
    "메타태그",
    "메타 태그",
    "호스팅 또는 사이트 서버",
)


class OwnershipVerifyFailedError(RuntimeError):
    """소유확인 제출 후 메타 태그 등 실패."""


def ownership_verify_failed_alert(driver, *, on_log: LogFn = None) -> bool:
    """소유확인 제출 후 메타 태그 등 실패 alert 가 있으면 확인 후 True."""
    alert_text = accept_security_alert_if_present(driver, on_log=on_log)
    if alert_text and any(w in alert_text for w in _OWNERSHIP_FAIL_ALERT_WORDS):
        _emit(f"  ✗ 소유확인 실패: {alert_text}", on_log)
        return True
    return False


def captcha_submit_outcome(driver, *, on_log: LogFn = None) -> str:
    """CAPTCHA/소유확인 제출 결과: ok | captcha_fail | ownership_fail."""
    alert_text = accept_security_alert_if_present(driver, on_log=on_log)
    if alert_text:
        if any(w in alert_text for w in _OWNERSHIP_FAIL_ALERT_WORDS):
            _emit(f"  ✗ 소유확인 실패: {alert_text}", on_log)
            return "ownership_fail"
        if any(
            w in alert_text for w in ("검증에 실패", "보안절차", "자동등록", "보안")
        ):
            _emit("  CAPTCHA 코드 오류 — 재시도합니다.", on_log)
            return "captcha_fail"
    if captcha_modal_visible(driver):
        return "captcha_fail"
    return "ok"


def captcha_submit_failed(driver, *, on_log: LogFn = None) -> bool:
    """CAPTCHA 제출 후 재시도가 필요한지."""
    return captcha_submit_outcome(driver, on_log=on_log) == "captcha_fail"


def captcha_modal_visible(driver) -> bool:
    dialog = _find_captcha_dialog(driver)
    if dialog is None:
        return False
    if _find_captcha_input(driver) is not None:
        return True
    return _find_captcha_image(driver) is not None


def wait_and_solve_naver_captcha_modal(
    driver,
    *,
    twocaptcha_api_key: str = "",
    wait_timeout: float = 20.0,
    max_attempts: int = 5,
    on_log: LogFn = None,
) -> bool:
    """소유확인 등 클릭 후 보안절차 모달 대기 → 2Captcha → 입력 → [확인]."""
    _emit("  보안절차 코드 모달 대기 중…", on_log)
    deadline = time.time() + wait_timeout
    while time.time() < deadline:
        if captcha_modal_visible(driver):
            break
        time.sleep(0.35)

    if not captcha_modal_visible(driver):
        _emit("  보안절차 모달 없음 — 다음 단계로 진행", on_log)
        return True

    if not has_captcha_solver(twocaptcha_api_key):
        _emit("  ⚠ 2Captcha API 키가 필요합니다.", on_log)
        return False

    _emit("  보안절차 코드 감지 — 2Captcha로 인식합니다.", on_log)
    for attempt in range(max_attempts):
        if attempt > 0:
            _emit(f"  보안절차 재시도 ({attempt + 1}/{max_attempts})", on_log)
            report_last_2captcha_bad(twocaptcha_api_key)
            refresh_captcha_image(driver, on_log=on_log)
            time.sleep(1.0)
            if not _wait_for_captcha_modal(driver, on_log=on_log):
                _emit("  보안절차 모달 재표시 대기 시간 초과", on_log)
        submitted = solve_naver_captcha_modal(
            driver,
            twocaptcha_api_key=twocaptcha_api_key,
            on_log=on_log,
        )
        if not submitted:
            refresh_captcha_image(driver, on_log=on_log)
            _wait_for_captcha_modal(driver, on_log=on_log)
            time.sleep(1.5)
            continue

        time.sleep(1.2)
        outcome = captcha_submit_outcome(driver, on_log=on_log)
        if outcome == "ownership_fail":
            raise OwnershipVerifyFailedError("네이버 소유확인 실패")
        if outcome == "captcha_fail":
            report_last_2captcha_bad(twocaptcha_api_key)
            refresh_captcha_image(driver, on_log=on_log)
            _wait_for_captcha_modal(driver, on_log=on_log)
            time.sleep(1.0)
            continue
        if not captcha_modal_visible(driver):
            _emit("  ✓ 보안절차 코드 입력·확인 완료", on_log)
            return True
        time.sleep(1.5)

    _emit(f"  ✗ 보안절차 자동 처리 실패 ({max_attempts}회 시도)", on_log)
    return False


def solve_naver_captcha_modal(
    driver,
    *,
    twocaptcha_api_key: str = "",
    on_log: LogFn = None,
) -> bool:
    """보안코드 모달이 있으면 2Captcha로 입력 후 [확인] 클릭."""
    if not captcha_modal_visible(driver):
        return False

    inp = _find_captcha_input(driver)
    if not inp:
        _emit("  CAPTCHA 모달은 보이나 입력 요소를 찾지 못했습니다.", on_log)
        return False

    try:
        png, image_url = _capture_captcha_bytes(driver, on_log=on_log)
    except ValueError as exc:
        _emit(f"  CAPTCHA 캡처 실패: {exc}", on_log)
        return False

    if not _driver_alive(driver):
        _emit("  브라우저 세션이 종료되었습니다 (CAPTCHA 인식 전)", on_log)
        return False

    try:
        code = read_captcha_code(
            png,
            twocaptcha_api_key=twocaptcha_api_key,
            image_url=image_url,
            on_log=on_log,
            driver=driver,
        )
    except Exception as exc:
        _emit(f"  CAPTCHA 인식 오류: {exc}", on_log)
        return False

    if not _driver_alive(driver):
        _emit("  브라우저 세션이 종료되었습니다 (CAPTCHA 입력 전)", on_log)
        return False

    if not _valid_captcha_code(code):
        _emit(f"  CAPTCHA 코드 형식 오류 — 재시도 필요: {code!r}", on_log)
        return False

    _emit(f"  CAPTCHA 코드 입력: {code}", on_log)

    from selenium.webdriver.common.keys import Keys

    inp.click()
    inp.send_keys(Keys.CONTROL, "a")
    inp.send_keys(Keys.DELETE)
    inp.send_keys(code)
    time.sleep(0.5)

    dialog = _find_captcha_dialog(driver)
    clicked = False
    if dialog and _click_dialog_confirm(driver, dialog, on_log=on_log):
        clicked = True
    else:
        from selenium.webdriver.common.by import By

        for btn in driver.find_elements(By.XPATH, "//button[contains(.,'확인')]"):
            try:
                if btn.is_displayed() and btn.is_enabled():
                    btn.click()
                    clicked = True
                    break
            except Exception:
                continue

    if not clicked:
        return False

    _emit("  CAPTCHA [확인] 클릭", on_log)
    time.sleep(1.2)
    return True

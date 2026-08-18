import { absoluteUrl, guidePageUrl } from "./site";

/** IndexNow 공개 키 — public/{key}.txt 와 동일해야 함 */
export const INDEXNOW_KEY =
  process.env.INDEXNOW_KEY?.trim() || "b7e4d9c2a1f8563048e7b6c5d4a39281";

const ENDPOINT = "https://api.indexnow.org/indexnow";

function siteHost(): string {
  try {
    return new URL(absoluteUrl("/")).host;
  } catch {
    return "www.purmegarden.co.kr";
  }
}

export function indexNowKeyLocation(): string {
  return `${absoluteUrl("/")}/${INDEXNOW_KEY}.txt`;
}

export type IndexNowResult = {
  ok: boolean;
  message: string;
  submitted: number;
};

export async function submitIndexNow(urls: string[]): Promise<IndexNowResult> {
  const unique = [
    ...new Set(
      urls
        .map((u) => u.trim().replace(/\/+$/, ""))
        .filter(Boolean)
    ),
  ];
  if (!unique.length) {
    return { ok: false, message: "제출할 URL이 없습니다.", submitted: 0 };
  }

  const host = siteHost();
  const payload = {
    host,
    key: INDEXNOW_KEY,
    keyLocation: indexNowKeyLocation(),
    urlList: unique,
  };

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });
    if (res.status === 200 || res.status === 202) {
      return {
        ok: true,
        message: `IndexNow 성공 · 글 ${unique.length}건`,
        submitted: unique.length,
      };
    }
    const text = await res.text().catch(() => "");
    return {
      ok: false,
      message: `IndexNow 실패 HTTP ${res.status}: ${text.slice(0, 200)}`,
      submitted: 0,
    };
  } catch (e) {
    return {
      ok: false,
      message: `IndexNow 오류: ${e instanceof Error ? e.message : e}`,
      submitted: 0,
    };
  }
}

export function absoluteGuideUrl(slug: string): string {
  return guidePageUrl(slug);
}

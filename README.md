# 조경인테리어 푸르메정원 (purme)

Next.js 15 기반 정원·테라스 인테리어 사이트입니다.

## 배포 규칙 (필수)

이 폴더는 **오직** `inchowon58-beep/purme` 로만 push 합니다.  
구름이네(`cloudshelter`), 제주감귤(`jejumilgam`) 등 다른 사이트로는 절대 push·deploy 하지 않습니다.

| 항목 | 허용 | 금지 |
|------|------|------|
| GitHub | `inchowon58-beep/purme` | `cloudshelter`, `jejumilgam` 등 |

```bash
npm run check:git-target
```

## 시작

```bash
npm install
npm run dev
```

## 주요 설정

- `src/lib/site.ts` — 업체명, 전화(010-55606-9637), CDN, 도메인
- 이미지 CDN: `https://image.cattery.co.kr/purme/`
- 히어로 영상: `public/videos/hero.mp4` (Mixkit 정원 빌라 영상)
- SEO: `/guide/[slug]` + `tools/webdoc`
- 하단 CTA: 인테리어상담문의 + infocs 렌탈 문의

## GitHub

```
https://github.com/inchowon58-beep/purme.git
```

## 웹문서 생성기

`푸르메정원_웹문서생성기.bat` 또는 `tools/webdoc/푸르메정원_웹문서생성기_실행.bat`

## 텔레그램 문의 알림

설정: [`docs/telegram-setup.md`](docs/telegram-setup.md)

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID` (숫자)
- `TELEGRAM_BOT_USERNAME`

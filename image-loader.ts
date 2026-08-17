/** CDN 직접 로드 — Vercel Image Optimization 비용 $0 */
export default function imageLoader({ src }: { src: string }): string {
  return src;
}

import type { SeoPage } from "@/lib/seo-pages";
import { galleryAlt } from "@/lib/images";
import TrimFillImage from "./TrimFillImage";

type Props = {
  page: SeoPage;
  imageSrc: string;
};

export default function GuideHeroThumb({ page, imageSrc }: Props) {
  const badge = page.heroBadge || "신뢰 시공";
  const line1 = page.heroTitleLine1 || page.keyword;
  const line2 = page.heroTitleLine2 || "정원 · 테라스 인테리어";
  const bar = page.heroBar || page.heroSubtitle || "상담부터 완공까지 과정을 투명하게";

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[720px] overflow-hidden rounded-[1.75rem] shadow-[0_16px_40px_rgba(28,36,52,0.12)] ring-1 ring-white/80">
      <TrimFillImage src={imageSrc} alt={galleryAlt(page.keyword, 1)} priority />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(28,36,52,0.15)_0%,rgba(28,36,52,0.55)_100%)]" />
      <div className="pointer-events-none absolute inset-3 rounded-[1.35rem] border border-white/90 md:inset-4" />

      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <span className="rounded-full bg-[linear-gradient(135deg,#3d8b6e,#24634d)] px-4 py-1.5 text-[0.7rem] font-semibold tracking-wide text-white shadow-md md:text-xs">
          {badge}
        </span>

        <h1 className="mt-5 max-w-[16ch] text-[clamp(1.85rem,6.5vw,3.15rem)] font-extrabold leading-[1.2] text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.55)]">
          <span className="block">{line1}</span>
          <span className="mt-1 block text-[#cde8dc] drop-shadow-[0_3px_10px_rgba(0,0,0,0.5)]">
            {line2}
          </span>
        </h1>

        <p className="mt-6 max-w-md rounded-full bg-[rgba(0,0,0,0.55)] px-5 py-2.5 text-[0.8rem] font-medium leading-snug text-white md:text-[0.95rem]">
          {bar}
        </p>
      </div>
    </div>
  );
}

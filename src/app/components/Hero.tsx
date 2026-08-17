import { ArrowDown } from "lucide-react";
import { SITE, CTA_LABEL } from "@/lib/site";
import { imageUrl } from "@/lib/images";

const HERO_VIDEO_SRC = "/videos/hero.mp4";

export default function Hero() {
  const poster = imageUrl(5);

  return (
    <section id="top" className="relative min-h-[100svh] overflow-hidden text-white">
      <div className="absolute inset-0 hero-media">
        <video
          className="h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={poster}
          aria-hidden
        >
          <source src={HERO_VIDEO_SRC} type="video/mp4" />
        </video>
      </div>

      <div className="container relative flex min-h-[100svh] flex-col justify-end pb-32 pt-32 md:justify-center md:pb-24 md:pt-28">
        <p className="animate-rise text-sm font-semibold tracking-[0.08em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)]">
          {SITE.farm} · {SITE.taglineEn}
        </p>
        <h1 className="animate-rise-delay mt-3 max-w-3xl text-4xl font-extrabold drop-shadow-[0_3px_14px_rgba(0,0,0,0.7)] sm:text-5xl md:text-6xl">
          {SITE.name}
          <span className="mt-3 block text-[0.55em] font-bold leading-snug text-white">
            정원과 테라스를, 오래 남을 풍경으로
          </span>
        </h1>
        <p className="animate-rise-delay-2 mt-5 max-w-xl text-base text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)] md:text-lg">
          정원인테리어부터 테라스인테리어까지, 상담·설계·시공을 투명하게 진행합니다.
        </p>
        <div className="animate-rise-delay-2 mt-8 flex flex-wrap gap-3">
          <a href="#works" className="btn-primary">
            시공 사례 보기
            <ArrowDown size={18} />
          </a>
          <a href={SITE.phoneTel} className="btn-secondary !border-white/80 !bg-black/25 backdrop-blur-sm">
            {CTA_LABEL} {SITE.phoneDisplay}
          </a>
        </div>
      </div>
    </section>
  );
}

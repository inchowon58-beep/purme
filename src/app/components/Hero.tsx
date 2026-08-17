"use client";

import { useEffect, useRef } from "react";
import { ArrowDown } from "lucide-react";
import { SITE, CTA_LABEL } from "@/lib/site";
import { imageUrl } from "@/lib/images";

const HERO_VIDEO_SRC = "/videos/hero.mp4";

export default function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const poster = imageUrl(5);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
    video.setAttribute("x5-playsinline", "true");

    const tryPlay = () => {
      const play = video.play();
      if (play) play.catch(() => {});
    };

    tryPlay();
    video.addEventListener("canplay", tryPlay);
    video.addEventListener("loadeddata", tryPlay);

    const onVisible = () => {
      if (document.visibilityState === "visible") tryPlay();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", tryPlay);

    const onFirstGesture = () => tryPlay();
    document.addEventListener("touchstart", onFirstGesture, { once: true, passive: true });
    document.addEventListener("click", onFirstGesture, { once: true });

    return () => {
      video.removeEventListener("canplay", tryPlay);
      video.removeEventListener("loadeddata", tryPlay);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", tryPlay);
      document.removeEventListener("touchstart", onFirstGesture);
      document.removeEventListener("click", onFirstGesture);
    };
  }, []);

  return (
    <section id="top" className="relative h-[100svh] min-h-[100svh] overflow-hidden text-white">
      <div className="hero-media absolute inset-0">
        <video
          ref={videoRef}
          className="hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={poster}
          controls={false}
          disablePictureInPicture
          disableRemotePlayback
          aria-hidden
        >
          <source src={HERO_VIDEO_SRC} type="video/mp4" />
        </video>
      </div>
      <div className="hero-overlay pointer-events-none absolute inset-0" />

      <div className="container relative z-10 flex h-full min-h-[100svh] flex-col justify-end pb-36 pt-28 md:justify-center md:pb-24 md:pt-28">
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

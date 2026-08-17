"use client";

import { useCallback, useMemo, useState } from "react";

type Props = {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
};

const WHITE = 248;

function detectWhiteTrim(img: HTMLImageElement) {
  const maxSide = 180;
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { l: 0, t: 0, r: 0, b: 0 };

  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const empty = (i: number) => {
    if (data[i + 3] < 12) return true;
    return data[i] >= WHITE && data[i + 1] >= WHITE && data[i + 2] >= WHITE;
  };

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (!empty((y * w + x) * 4)) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return { l: 0, t: 0, r: 0, b: 0 };

  return {
    l: minX / w,
    t: minY / h,
    r: (w - 1 - maxX) / w,
    b: (h - 1 - maxY) / h,
  };
}

export default function TrimFillImage({ src, alt, className = "", priority = false }: Props) {
  const [viewBox, setViewBox] = useState<string | undefined>();
  const [zoom, setZoom] = useState(1);
  const [origin, setOrigin] = useState("center center");
  const canViewBox = useMemo(
    () => typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("object-view-box", "inset(0%)"),
    []
  );

  const onLoad = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      try {
        const trim = detectWhiteTrim(event.currentTarget);
        const cw = Math.max(0.2, 1 - trim.l - trim.r);
        const ch = Math.max(0.2, 1 - trim.t - trim.b);
        const padX = Math.min(0.02, cw * 0.02);
        const padY = Math.min(0.02, ch * 0.02);
        const l = Math.max(0, trim.l + padX);
        const r = Math.max(0, trim.r + padX);
        const t = Math.max(0, trim.t + padY);
        const b = Math.max(0, trim.b + padY);
        const contentW = Math.max(0.2, 1 - l - r);
        const contentH = Math.max(0.2, 1 - t - b);

        if (canViewBox) {
          setViewBox(`inset(${t * 100}% ${r * 100}% ${b * 100}% ${l * 100}%)`);
          setZoom(1);
          return;
        }

        const nextZoom = Math.max(1 / contentW, 1 / contentH);
        setViewBox(undefined);
        setZoom(nextZoom > 1.03 ? nextZoom : 1);
        setOrigin(`${((l + 1 - r) / 2) * 100}% ${((t + 1 - b) / 2) * 100}%`);
      } catch {
        setViewBox(undefined);
        setZoom(1);
      }
    },
    [canViewBox]
  );

  return (
    <img
      src={src}
      alt={alt}
      crossOrigin="anonymous"
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      onLoad={onLoad}
      className={`absolute inset-0 h-full w-full max-w-none object-cover ${className}`}
      style={
        {
          objectFit: "cover",
          ...(viewBox ? { objectViewBox: viewBox } : {}),
          transform: zoom > 1 ? `scale(${zoom})` : undefined,
          transformOrigin: origin,
        } as React.CSSProperties
      }
    />
  );
}

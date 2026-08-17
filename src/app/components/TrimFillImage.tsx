"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

type Props = {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
};

type Trim = { l: number; t: number; r: number; b: number };
type Box = { width: number; height: number; left: number; top: number };

const EMPTY = { l: 0, t: 0, r: 0, b: 0 };

function nearWhite(r: number, g: number, b: number, a: number) {
  if (a < 18) return true;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max >= 236 && max - min <= 18;
}

function rowMostlyEmpty(data: Uint8ClampedArray, w: number, y: number) {
  let empty = 0;
  for (let x = 0; x < w; x += 1) {
    const i = (y * w + x) * 4;
    if (nearWhite(data[i], data[i + 1], data[i + 2], data[i + 3])) empty += 1;
  }
  return empty / w >= 0.92;
}

function colMostlyEmpty(data: Uint8ClampedArray, w: number, h: number, x: number) {
  let empty = 0;
  for (let y = 0; y < h; y += 1) {
    const i = (y * w + x) * 4;
    if (nearWhite(data[i], data[i + 1], data[i + 2], data[i + 3])) empty += 1;
  }
  return empty / h >= 0.92;
}

function detectWhiteTrim(img: HTMLImageElement): Trim {
  const maxSide = 220;
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return EMPTY;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  let t = 0;
  let b = 0;
  let l = 0;
  let r = 0;
  while (t < h - 2 && rowMostlyEmpty(data, w, t)) t += 1;
  while (b < h - 2 - t && rowMostlyEmpty(data, w, h - 1 - b)) b += 1;
  while (l < w - 2 && colMostlyEmpty(data, w, h, l)) l += 1;
  while (r < w - 2 - l && colMostlyEmpty(data, w, h, w - 1 - r)) r += 1;

  return { l: l / w, t: t / h, r: r / w, b: b / h };
}

function coverBox(wrapW: number, wrapH: number, natW: number, natH: number, trim: Trim): Box {
  const pad = 0.012;
  const l = Math.min(0.45, Math.max(0, trim.l + pad));
  const r = Math.min(0.45, Math.max(0, trim.r + pad));
  const t = Math.min(0.45, Math.max(0, trim.t + pad));
  const b = Math.min(0.45, Math.max(0, trim.b + pad));
  const cw = Math.max(8, (1 - l - r) * natW);
  const ch = Math.max(8, (1 - t - b) * natH);
  const scale = Math.max(wrapW / cw, wrapH / ch) * 1.03;
  return {
    width: natW * scale,
    height: natH * scale,
    left: -(l * natW) * scale,
    top: -(t * natH) * scale,
  };
}

export default function TrimFillImage({ src, alt, className = "", priority = false }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const trimRef = useRef<Trim>(EMPTY);
  const [box, setBox] = useState<Box | null>(null);

  const layout = useCallback(() => {
    const wrap = wrapRef.current;
    const img = imgRef.current;
    if (!wrap || !img || !img.naturalWidth) return;
    const wrapW = wrap.clientWidth;
    const wrapH = wrap.clientHeight;
    if (!wrapW || !wrapH) return;
    setBox(coverBox(wrapW, wrapH, img.naturalWidth, img.naturalHeight, trimRef.current));
  }, []);

  const onLoad = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    try {
      trimRef.current = detectWhiteTrim(img);
    } catch {
      trimRef.current = EMPTY;
    }
    layout();
  }, [layout]);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => layout());
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [layout, src]);

  return (
    <div ref={wrapRef} className={`trim-fill ${className}`.trim()}>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        crossOrigin="anonymous"
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        onLoad={onLoad}
        className={box ? "trim-fill-img is-fitted" : "trim-fill-img"}
        style={
          box
            ? {
                width: box.width,
                height: box.height,
                left: box.left,
                top: box.top,
              }
            : undefined
        }
      />
    </div>
  );
}

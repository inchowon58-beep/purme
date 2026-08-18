import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  // 끝 슬래시 없음이 표준 URL. 자동 308(/guide/ → /guide)은 네이버 수집 Permanent redirect(301)로 실패함.
  trailingSlash: false,
  skipTrailingSlashRedirect: true,
  images: {
    unoptimized: true,
    loader: "custom",
    loaderFile: "./image-loader.ts",
    remotePatterns: [
      { protocol: "https", hostname: "image.cattery.co.kr" },
    ],
  },
};

export default nextConfig;

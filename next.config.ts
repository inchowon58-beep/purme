import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
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

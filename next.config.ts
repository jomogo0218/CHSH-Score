import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // 避免父目錄另有 lockfile、以及中文路徑導致 Turbopack ident panic
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "api.dicebear.com" },
    ],
  },
};

export default nextConfig;

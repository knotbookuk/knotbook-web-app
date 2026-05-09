import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
    // Long-cache optimized variants. Matches default but explicit for clarity.
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  // Compress responses (Next defaults to true, kept explicit).
  compress: true,
  // Trim known-unused locales from moment-style libs etc.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;

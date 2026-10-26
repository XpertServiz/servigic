import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self), payment=()" },
];

const nextConfig: NextConfig = {
  // Face check (free, on our own server): libraries run from node_modules, and their model / wasm files are shipped with the route.
  serverExternalPackages: ["@vladmandic/face-api", "@tensorflow/tfjs", "@tensorflow/tfjs-backend-wasm", "sharp"],
  outputFileTracingIncludes: {
    "/api/mobile/provider/face-check": ["./node_modules/@vladmandic/face-api/model/**/*", "./node_modules/@vladmandic/face-api/dist/face-api.node-wasm.js", "./node_modules/@tensorflow/tfjs-backend-wasm/dist/**/*"],
  },
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "*.ufs.sh" },
    ],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/icons/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
};

export default withNextIntl(nextConfig);

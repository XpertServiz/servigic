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
  async redirects() {
    // Addresses that visitors and Google try (and that used to be 404) go to the real page.
    return [
      { source: "/privacy", destination: "/legal/privacy", permanent: true },
      { source: "/:locale(ar|de|es|fr|hi|it|nl|pl|pt|tr|ur)/privacy", destination: "/:locale/legal/privacy", permanent: true },
      { source: "/privacy-policy", destination: "/legal/privacy", permanent: true },
      { source: "/:locale(ar|de|es|fr|hi|it|nl|pl|pt|tr|ur)/privacy-policy", destination: "/:locale/legal/privacy", permanent: true },
      { source: "/terms", destination: "/legal/terms", permanent: true },
      { source: "/:locale(ar|de|es|fr|hi|it|nl|pl|pt|tr|ur)/terms", destination: "/:locale/legal/terms", permanent: true },
      { source: "/terms-and-conditions", destination: "/legal/terms", permanent: true },
      { source: "/:locale(ar|de|es|fr|hi|it|nl|pl|pt|tr|ur)/terms-and-conditions", destination: "/:locale/legal/terms", permanent: true },
      { source: "/terms-of-service", destination: "/legal/terms", permanent: true },
      { source: "/:locale(ar|de|es|fr|hi|it|nl|pl|pt|tr|ur)/terms-of-service", destination: "/:locale/legal/terms", permanent: true },
      { source: "/tos", destination: "/legal/terms", permanent: true },
      { source: "/:locale(ar|de|es|fr|hi|it|nl|pl|pt|tr|ur)/tos", destination: "/:locale/legal/terms", permanent: true },
      { source: "/legal", destination: "/legal/terms", permanent: true },
      { source: "/:locale(ar|de|es|fr|hi|it|nl|pl|pt|tr|ur)/legal", destination: "/:locale/legal/terms", permanent: true },
      { source: "/for-pros", destination: "/pro", permanent: true },
      { source: "/:locale(ar|de|es|fr|hi|it|nl|pl|pt|tr|ur)/for-pros", destination: "/:locale/pro", permanent: true },
      { source: "/pros", destination: "/pro", permanent: true },
      { source: "/:locale(ar|de|es|fr|hi|it|nl|pl|pt|tr|ur)/pros", destination: "/:locale/pro", permanent: true },
      { source: "/become-a-pro", destination: "/pro", permanent: true },
      { source: "/:locale(ar|de|es|fr|hi|it|nl|pl|pt|tr|ur)/become-a-pro", destination: "/:locale/pro", permanent: true },
      { source: "/join-as-pro", destination: "/pro", permanent: true },
      { source: "/:locale(ar|de|es|fr|hi|it|nl|pl|pt|tr|ur)/join-as-pro", destination: "/:locale/pro", permanent: true },
      { source: "/pro/signup", destination: "/pro", permanent: true },
      { source: "/:locale(ar|de|es|fr|hi|it|nl|pl|pt|tr|ur)/pro/signup", destination: "/:locale/pro", permanent: true },
      { source: "/pro/register", destination: "/pro", permanent: true },
      { source: "/:locale(ar|de|es|fr|hi|it|nl|pl|pt|tr|ur)/pro/register", destination: "/:locale/pro", permanent: true },
      { source: "/pro/login", destination: "/login", permanent: true },
      { source: "/:locale(ar|de|es|fr|hi|it|nl|pl|pt|tr|ur)/pro/login", destination: "/:locale/login", permanent: true },
      { source: "/about", destination: "/how-it-works", permanent: true },
      { source: "/:locale(ar|de|es|fr|hi|it|nl|pl|pt|tr|ur)/about", destination: "/:locale/how-it-works", permanent: true },
      { source: "/about-us", destination: "/how-it-works", permanent: true },
      { source: "/:locale(ar|de|es|fr|hi|it|nl|pl|pt|tr|ur)/about-us", destination: "/:locale/how-it-works", permanent: true },
      { source: "/faq", destination: "/how-it-works", permanent: true },
      { source: "/:locale(ar|de|es|fr|hi|it|nl|pl|pt|tr|ur)/faq", destination: "/:locale/how-it-works", permanent: true },
      { source: "/help", destination: "/how-it-works", permanent: true },
      { source: "/:locale(ar|de|es|fr|hi|it|nl|pl|pt|tr|ur)/help", destination: "/:locale/how-it-works", permanent: true },
      { source: "/contact", destination: "/trust-and-safety", permanent: true },
      { source: "/:locale(ar|de|es|fr|hi|it|nl|pl|pt|tr|ur)/contact", destination: "/:locale/trust-and-safety", permanent: true },
      { source: "/contact-us", destination: "/trust-and-safety", permanent: true },
      { source: "/:locale(ar|de|es|fr|hi|it|nl|pl|pt|tr|ur)/contact-us", destination: "/:locale/trust-and-safety", permanent: true },
      { source: "/support", destination: "/trust-and-safety", permanent: true },
      { source: "/:locale(ar|de|es|fr|hi|it|nl|pl|pt|tr|ur)/support", destination: "/:locale/trust-and-safety", permanent: true },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/icons/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
};

export default withNextIntl(nextConfig);

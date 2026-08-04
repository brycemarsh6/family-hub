import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: {
    // The little Next.js dev badge defaults to the bottom-left, where it sits
    // directly on top of our phone tab bar. Top-right is empty on every screen
    // size we have. (Development only — it never ships to a real device.)
    position: "top-right",
  },
  // In dev mode, Next.js refuses requests for its own JS/CSS files that come
  // from any address other than localhost — a safety default that would
  // otherwise leave the phone with a blank, broken-looking page. The pattern
  // below allows any device on the 10.0.0.x home network. (Dev-only; this
  // setting has no effect in a production build.)
  allowedDevOrigins: ["10.0.0.*"],
  experimental: {
    serverActions: {
      // Default is 1MB. Recipe photo import (src/components/PhotoImportForm.tsx)
      // downscales each photo client-side before upload, but three base64-encoded
      // images plus multipart overhead can still add up — this leaves real
      // headroom rather than trusting the default and finding out in production.
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;

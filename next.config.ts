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
};

export default nextConfig;

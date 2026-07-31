import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: {
    // The little Next.js dev badge defaults to the bottom-left, where it sits
    // directly on top of our phone tab bar. Top-right is empty on every screen
    // size we have. (Development only — it never ships to a real device.)
    position: "top-right",
  },
};

export default nextConfig;

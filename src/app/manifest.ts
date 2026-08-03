import type { MetadataRoute } from "next";

// Makes the app installable as a real home-screen icon. `display: "standalone"`
// is what drops the browser's address bar when it's launched from the home
// screen, so it opens looking like its own app rather than a browser tab.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Marsh HQ",
    short_name: "Marsh HQ",
    description: "Shopping and inventory for the family.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf8f5",
    theme_color: "#faf8f5",
    icons: [
      {
        src: "/icon.png",
        sizes: "1024x1024",
        type: "image/png",
      },
    ],
  };
}

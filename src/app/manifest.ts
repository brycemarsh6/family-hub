import type { MetadataRoute } from "next";

// Makes the app installable as a real home-screen icon. `display: "standalone"`
// is what drops the browser's address bar when it's launched from the home
// screen, so it opens looking like its own app rather than a browser tab.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Marshee",
    short_name: "Marshee",
    description: "Shopping and inventory for the family.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f0e8",
    theme_color: "#f6f0e8",
    icons: [
      {
        src: "/icon.png",
        sizes: "1024x1024",
        type: "image/png",
      },
    ],
  };
}

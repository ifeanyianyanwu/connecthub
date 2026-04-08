import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ConnectHub",
    short_name: "ConnectHub",
    description: "Connect with people who share your hobbies",
    start_url: "/",
    display: "standalone",
    theme_color: "#ffffff",
    background_color: "#ffffff",
    icons: [
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    screenshots: [
      {
        src: "/screenshots/mobile.png",
        sizes: "390x844",
        type: "image/png",
        // form_factor tells Android this screenshot is for mobile — triggers
        // the richer "Add to Home Screen" sheet on Android Chrome
        form_factor: "narrow",
      },
    ],
  };
}

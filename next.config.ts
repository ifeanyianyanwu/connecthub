import type { NextConfig } from "next";

import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts", // your service worker source
  swDest: "public/sw.js", // where the compiled SW goes
  reloadOnOnline: false, // IMPORTANT: prevents forced page reload when
  // coming back online — would wipe unsaved form data
  disable: process.env.NODE_ENV === "development", // avoid cache hell during dev
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
      },
      {
        protocol: "https",
        hostname: "rrawqwnupvlfonteiyrt.supabase.co",
        port: "",
      },
    ],
  },
};

export default withSerwist(nextConfig);

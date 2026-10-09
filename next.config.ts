import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    workerThreads: true,
    useTypeScriptCli: false,
    turbopackPluginRuntimeStrategy: "workerThreads",
  },
  images: {
    // All imagery is served from /public/images (copied out of the HTTrack snapshot by
    // scripts/extract). Product shots use q=75, large banners q=70 like the reference site.
    qualities: [70, 75],
  },
  turbopack: {
    rules: {
      "*.css": {
        // Keep component CSS modules scoped by Next.js; the Tailwind loader
        // emits global CSS and is only needed for regular stylesheets.
        condition: { not: { path: /\.module\.css$/ } },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

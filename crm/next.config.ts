import type { NextConfig } from "next";

// The preview is exported as plain static files (folder `out/`), so it can be
// uploaded to any web hosting, including a shared Hostinger plan.
// Set BASE_PATH=/crm when the files will live in a subfolder instead of at the
// root of a domain or subdomain.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: process.env.BASE_PATH || undefined,
  images: { unoptimized: true },
  // Shown in Settings so an unexpected change of the app's code can be noticed.
  env: {
    NEXT_PUBLIC_BUILD: (process.env.GITHUB_SHA ?? "").slice(0, 7) || "local",
    NEXT_PUBLIC_BASE_PATH: process.env.BASE_PATH ?? "",
    NEXT_PUBLIC_BUILT_AT: new Date().toISOString().slice(0, 10),
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

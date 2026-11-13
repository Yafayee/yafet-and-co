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

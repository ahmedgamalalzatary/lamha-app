import path from "node:path";
import { config } from "dotenv";
import type { NextConfig } from "next";

// The one .env lives at the repo root (contract §5); Next only reads its own folder. Values already
// set (CI, the shell) win. Read before Next builds, so NEXT_PUBLIC_API_URL reaches the browser code.
config({ path: path.resolve(process.cwd(), "../../.env"), quiet: true });

const nextConfig: NextConfig = {
  // Production runs `node apps/web/server.js` from .next/standalone (Dockerfile.web). The trace
  // starts at the repo root, so the workspace's @tawsela/shared comes along.
  output: "standalone",
  outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Every dashboard page waits for the session the browser keeps (the area gate), so Next's
    // instant-navigation check cannot render them on the server. Only pages that opt in are checked.
    instantInsights: { validationLevel: "manual-warning" },
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

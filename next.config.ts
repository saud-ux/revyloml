import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  experimental: {
    /**
     * Audio and covers no longer travel through a server action — the browser
     * uploads them straight into storage and submits only the URL — so nothing
     * here needs megabytes. The cap is raised off its 1 MB default anyway to
     * cover the no-bucket fallback, where the file does ride in the form, and it
     * stays small on purpose: the free instance has 512 MB of memory and holds
     * the whole body while parsing it.
     */
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default config;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* your existing config */
};

const tauriNextConfig = {
  ...nextConfig,
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default process.env.TAURI === "true" ? tauriNextConfig : nextConfig;

import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const devRewrites: NextConfig["rewrites"] = async () => {
  const apiUrl = process.env.API_URL ?? "http://localhost:8000";
  return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
};

export default function nextConfig(phase: string): NextConfig {
  return {
    output: "standalone",
    rewrites: phase === PHASE_DEVELOPMENT_SERVER ? devRewrites : undefined,
  };
}

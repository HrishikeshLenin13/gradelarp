import type { NextConfig } from "next";
const config: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: { root: process.cwd() },
  devIndicators: false,
};
export default config;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow dev assets/HMR from 127.0.0.1 when dev server is on localhost.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    // Ensure Turbopack selects this frontend directory as the root
    root: __dirname,
  },
};

export default nextConfig;

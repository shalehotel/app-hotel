import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Logging de fetches para debugging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // Asegurar que errores de TypeScript no se ignoren en build
  typescript: {
    ignoreBuildErrors: false,
  },

  // Asegurar que errores de ESLint no se ignoren en build
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;

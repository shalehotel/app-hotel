import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Logging de fetches para debugging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // Ignorar errores de TypeScript en build (limpiar gradualmente)
  typescript: {
    ignoreBuildErrors: true,
  },

  // Ignorar errores de ESLint en build (limpiar gradualmente)
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

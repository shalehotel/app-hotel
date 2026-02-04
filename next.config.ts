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

  // Ignorar errores de ESLint en build (limpiar gradualmente)
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

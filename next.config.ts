import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {},

  output: 'standalone',

  typescript: {
    ignoreBuildErrors: true,
  },

  reactStrictMode: false,

  serverExternalPackages: ['@prisma/client', 'prisma'],

  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['/db/', '*/prisma/dev.db'],
    };

    return config;
  },
};

export default nextConfig;
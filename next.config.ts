import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // LOF Internal — served under /syncflow via nginx in production,
  // and Portal expects http://localhost:3002/syncflow in dev.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '/syncflow',

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },

  // Hide the Next.js dev tools indicator (the "N" circle in bottom-left)
  // — overlaps with the sidebar clock display in dev.
  devIndicators: false,

  // Required for Docker standalone build
  output: 'standalone',

  // Allow cross-origin requests in development
  allowedDevOrigins: ['192.168.1.82'],
};

export default nextConfig;

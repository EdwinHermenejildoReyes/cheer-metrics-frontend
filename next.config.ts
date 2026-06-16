import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',

  // Allow HMR from local network devices
  allowedDevOrigins: ['192.168.1.66'],

  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost',      port: '8006', pathname: '**' },
      { protocol: 'http', hostname: '192.168.1.66',   port: '8006', pathname: '**' },
    ],
  },

  // In `npm run dev` (outside Docker), proxy /api and /media to Nginx.
  // In Docker, Nginx intercepts these routes before they reach Next.js — rewrites are a no-op.
  async rewrites() {
    return [
      { source: '/api/:path*',   destination: 'http://localhost:8006/api/:path*' },
      { source: '/media/:path*', destination: 'http://localhost:8006/media/:path*' },
      { source: '/admin/:path*', destination: 'http://localhost:8006/admin/:path*' },
    ];
  },
};

export default nextConfig;

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
};

export default nextConfig;

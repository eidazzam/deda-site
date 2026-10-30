import type { NextConfig } from 'next';

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Emits a minimal self-contained server bundle so the production
  // Docker image stays small and skips re-running `npm install` at boot.
  output: 'standalone',

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'dedawomenswear.shop' },
    ],
  },

  // In local dev (no Docker / no Nginx) the api lives on a different port.
  // These rewrites proxy /api and /uploads so the browser sees the same
  // origin as the storefront and we avoid CORS in dev. In production the
  // same paths are served by Nginx in front of both containers, so the
  // rewrites become no-ops.
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${apiBase}/api/:path*` },
      { source: '/uploads/:path*', destination: `${apiBase}/uploads/:path*` },
    ];
  },
};

export default nextConfig;

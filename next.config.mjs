/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  compress: true,
  reactStrictMode: false,
  productionBrowserSourceMaps: false,
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/news',
        destination: '/api/news',
      },
      {
        source: '/news/:path*',
        destination: '/api/news/:path*',
      },
      {
        source: '/categories',
        destination: '/api/categories',
      },
      {
        source: '/types',
        destination: '/api/types',
      },
      {
        source: '/stats',
        destination: '/api/stats',
      },
      {
        source: '/openapi.json',
        destination: '/api/openapi.json',
      },
    ];
  },
};

export default nextConfig;

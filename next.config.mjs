/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  poweredByHeader: false,
  compress: true,
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
        source: '/images',
        destination: '/api/images',
      },
      {
        source: '/images/:path*',
        destination: '/api/images/:path*',
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
        source: '/revalidate',
        destination: '/api/revalidate',
      },
      {
        source: '/sync',
        destination: '/api/sync',
      },
      {
        source: '/openapi.json',
        destination: '/api/openapi.json',
      },
    ];
  },
};

export default nextConfig;

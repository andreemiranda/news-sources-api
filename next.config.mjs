/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  output: 'standalone',
  generateBuildId: async () => {
    return (
      process.env.BUILD_ID ||
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
      process.env.RENDER_GIT_COMMIT?.slice(0, 12) ||
      process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 12) ||
      'v1.0.0-release'
    );
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-App-Version', value: '1.0.0' },
          {
            key: 'X-Build-Id',
            value:
              process.env.BUILD_ID ||
              process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
              process.env.RENDER_GIT_COMMIT?.slice(0, 12) ||
              process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 12) ||
              'v1.0.0-release',
          },
        ],
      },
    ];
  },
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
        source: '/version',
        destination: '/api/version',
      },
      {
        source: '/openapi.json',
        destination: '/api/openapi.json',
      },
    ];
  },
};

export default nextConfig;

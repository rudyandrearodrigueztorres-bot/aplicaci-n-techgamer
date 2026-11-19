/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  outputFileTracingIncludes: {
    '/api/uploads/[filename]': ['./public/uploads/**/*'],
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/uploads/:path*',
      },
    ];
  },
};

export default nextConfig;


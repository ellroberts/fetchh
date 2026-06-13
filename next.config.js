/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {},

  allowedDevOrigins: [
    process.env.REPLIT_DEV_DOMAIN,
    `*.${process.env.REPLIT_DEV_DOMAIN}`,
  ].filter(Boolean),

  async headers() {
    return [
      {
        source: '/dev/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Content-Security-Policy', value: "frame-ancestors *" },
        ],
      },
    ]
  },

  transpilePackages: ['threadcub-design-system'],

  // 🔥 REMOVE these for Vercel
  // output: 'export',
  // distDir: 'dist',
  // basePath: '/threadcub',
  // assetPrefix: '/threadcub',
  // trailingSlash: true,

  images: {
    unoptimized: true,
  },

  // Fix for Supabase realtime client dependency issues
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      stream: false,
      url: false,
      zlib: false,
      http: false,
      https: false,
      assert: false,
      os: false,
      path: false,
    };
    return config;
  },
};

module.exports = nextConfig;
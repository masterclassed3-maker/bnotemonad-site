/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Required for Hostinger Node deployments
  output: "standalone",

  // 🔒 CRITICAL: Prevent cached HTML from pointing to old CSS chunks
  async headers() {
    return [
      // Do NOT cache HTML pages
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0",
          },
        ],
      },

      // Cache Next.js static assets safely (hashed filenames)
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;


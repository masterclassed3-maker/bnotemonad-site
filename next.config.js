/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Helps Node hosting (Hostinger) a lot:
  output: "standalone",
};

module.exports = nextConfig;

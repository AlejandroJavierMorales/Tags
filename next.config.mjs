/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "api.qrserver.com",
        pathname: "/**",
      },
    ],

    formats: ["image/avif", "image/webp"],

    deviceSizes: [320, 480, 640, 768, 1024],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],

    minimumCacheTTL: 60 * 60 * 24,
  },

  webpack: (config, { dev }) => {
    if (!dev) {
      config.cache = false;
    }

    return config;
  },

  async rewrites() {
    return [];
  },
};

export default nextConfig;
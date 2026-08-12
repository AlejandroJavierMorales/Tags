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

    minimumCacheTTL: 60 * 60 * 24 * 365,
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

  async headers() {
    return [{
      source: "/directory/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    }];
  },
};

export default nextConfig;

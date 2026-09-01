// next.config.js
module.exports = {
  images: {
    domains: ["storage.googleapis.com"],
  },
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
    ],
  },
};

module.exports = nextConfig;
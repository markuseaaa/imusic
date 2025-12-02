/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "imusic.b-cdn.net",
      },
    ],
  },
};

export default nextConfig;

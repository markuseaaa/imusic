/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "external-preview.redd.it",
      },
      {
        protocol: "https",
        hostname: "cherrychumagazine.com",
      },
      {
        protocol: "https",
        hostname: "kpopofficial.com",
      },
      {
        protocol: "https",
        hostname: "koreajoongangdaily.joins.com",
      },
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
      },
      {
        protocol: "https",
        hostname: "nolae.eu",
      },
      {
        protocol: "https",
        hostname: "m.media-amazon.com",
      },
      {
        protocol: "https",
        hostname: "linefriendssquare.com",
      },
      {
        protocol: "https",
        hostname: "iscale.iheart.com",
      },
      {
        protocol: "https",
        hostname: "imusic.b-cdn.net",
      },
      {
        protocol: "https",
        hostname: "preview.redd.it",
      },
      {
        protocol: "https",
        hostname: "www.kpopbazaar.com.au",
      },
      {
        protocol: "https",
        hostname: "kprofiles.com",
      },
    ],
  },
};

export default nextConfig;

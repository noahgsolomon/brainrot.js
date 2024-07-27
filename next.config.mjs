/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
/** @type {import("next").NextConfig} */

const nextConfig = {
  pageExtensions: ["js", "jsx", "ts", "tsx"],
  staticPageGenerationTimeout: 100,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.icons8.con",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "images.codefoli.com",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "oaidalleapiprodscus.blob.core.windows.net",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "images.smart.wtf",
        pathname: "**",
      },
    ],
  },
};

export default nextConfig;

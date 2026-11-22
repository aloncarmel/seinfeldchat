import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Images are pre-optimized WebP files in /public, served as free static assets.
    unoptimized: true,
  },
};

export default nextConfig;

initOpenNextCloudflareForDev();

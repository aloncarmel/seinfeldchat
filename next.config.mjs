/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'place-hold.it',
      },
    ],
  },
};

export default nextConfig; 
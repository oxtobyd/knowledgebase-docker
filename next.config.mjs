/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  env: {
    PORT: process.env.PORT || 3002
  },
  output: 'standalone',
}

export default nextConfig

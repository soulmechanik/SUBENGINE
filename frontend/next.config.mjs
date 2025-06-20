/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_BACKEND_API_URL: process.env.NEXT_PUBLIC_BACKEND_API_URL,
    JWT_SECRET: process.env.JWT_SECRET,
  },
};

export default nextConfig;


import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ltsbfcnlfpzsbfqwmazx.supabase.co",
        pathname: "/storage/v1/object/public/company-logos/**",
      },
    ],
  },
};

export default nextConfig;
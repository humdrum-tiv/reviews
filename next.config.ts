import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow File System Access API and other modern browser features
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Cross-Origin-Opener-Policy',
          value: 'same-origin',
        },
      ],
    },
  ],
};

export default nextConfig;

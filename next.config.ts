import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zfaagizkdixopldhqixv.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYWFnaXprZGl4b3BsZGhxaXh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMDA1MTQsImV4cCI6MjA4NTg3NjUxNH0.SnQXSR0AO44NeWO0xv1WdOZ8dfJrn6pKRiJWOHPrOWI',
    NEXT_PUBLIC_KAKAO_MAP_KEY: process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || 'c9b7bd6fa67ee5f5724b76fa58d72ecc',
    NEXT_PUBLIC_KAKAO_REST_KEY: process.env.NEXT_PUBLIC_KAKAO_REST_KEY || 'a53f6232d8f1359a7ae209f983bf87f5',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zfaagizkdixopldhqixv.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'nmrhxvtcvcbcnaeonvsd.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ['error', 'warn'] } : false,
  },
};

export default nextConfig;


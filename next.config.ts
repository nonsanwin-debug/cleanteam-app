import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zfaagizkdixopldhqixv.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYWFnaXprZGl4b3BsZGhxaXh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMDA1MTQsImV4cCI6MjA4NTg3NjUxNH0.SnQXSR0AO44NeWO0xv1WdOZ8dfJrn6pKRiJWOHPrOWI',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zfaagizkdixopldhqixv.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
};

export default nextConfig;


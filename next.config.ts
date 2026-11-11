import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The customer app uses this number for its WhatsApp return link.
  env: {
    NEXT_PUBLIC_WHATSAPP_NUMBER: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || process.env.YCLOUD_PHONE_NUMBER || "",
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Implicit e 1MB - prea putin pentru oferte PDF (pot avea usor cateva
    // MB cu poze/specificatii incluse). Marit la 15MB.
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;

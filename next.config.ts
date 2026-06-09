import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") ?? "",
      ].filter(Boolean),
    },
  },
  // Prevent Next.js from bundling these — let Node resolve them at runtime.
  // Needed because @better-auth/kysely-adapter bundles a bun-sqlite dialect
  // that imports constants removed from kysely >=0.27 main entry.
  serverExternalPackages: ["better-auth", "@better-auth/kysely-adapter", "kysely"],
};

export default nextConfig;

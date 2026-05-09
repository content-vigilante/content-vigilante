import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The @content-vigilante/core package imports bun:sqlite via the sqlite-vec store.
  // The web UI doesn't currently use the store path, but we mark sqlite-vec + better-sqlite3
  // as server-only to avoid bundling them into the client.
  serverExternalPackages: ['sqlite-vec', 'bun:sqlite', 'playwright'],
  typedRoutes: true,
};

export default nextConfig;

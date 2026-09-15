/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Traces the exact files the server needs and emits a self-contained bundle
   * in .next/standalone. The Docker runtime stage copies that instead of the
   * whole node_modules tree, which is what keeps the final image small.
   */
  output: 'standalone',

  /**
   * Prisma ships a native query engine binary. Marking the packages external
   * stops the bundler trying to inline them, which would break the binary
   * lookup at runtime inside the container.
   */
  serverExternalPackages: ['@prisma/client', 'prisma'],
};

export default nextConfig;

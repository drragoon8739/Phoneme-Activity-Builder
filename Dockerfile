# Phoneme Activity Builder — production container
#
# Multi-stage build. The final image carries only the compiled app, the Prisma
# client and the migration files: no source, no dev dependencies, no build
# toolchain. That keeps the image small and means the running container has
# nothing in it that is not needed to serve requests.

# --- Stage 1: dependencies --------------------------------------------------
FROM node:22-slim AS deps
WORKDIR /app

# openssl is required by Prisma's query engine at both build and run time.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy manifests only, so this layer is cached and npm ci re-runs solely when
# the dependencies actually change — not on every source edit.
COPY package.json package-lock.json ./
COPY prisma ./prisma

# `npm ci` installs exactly what package-lock.json pins, which is what makes
# the build reproducible across machines. The postinstall hook runs
# `prisma generate`, so the client is built here against the schema copied above.
RUN npm ci

# --- Stage 2: build ---------------------------------------------------------
FROM node:22-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# next.config.mjs sets output: 'standalone', which traces the exact files the
# server needs and emits a self-contained bundle in .next/standalone.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

# --- Stage 3: runtime -------------------------------------------------------
FROM node:22-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl wget \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# The SQLite file lives on a volume, not in the image, so data survives a
# rebuild. DATABASE_URL points at that mount.
ENV DATABASE_URL="file:/app/data/production.db"

# Run as a non-root user. If the container is ever compromised, the process
# has no ability to write outside the paths it is explicitly given.
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

# The standalone bundle, plus the assets it does not trace automatically.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Migrations, schema and seed, so the entrypoint can bring an empty volume up
# to date on first start.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/src/data ./src/data

# The full dependency tree, copied after the standalone bundle so it supersedes
# the traced subset.
#
# Standalone output traces only what the *server* imports at runtime, which does
# not include the Prisma CLI — and the CLI is needed here, because the entrypoint
# runs `prisma migrate deploy` against a volume the image knows nothing about.
# Copying selected node_modules subfolders instead was tried and is not viable:
# the CLI pulls in a web of transitive dependencies, so cherry-picking folders
# fails at runtime on whichever one was missed. Taking the whole tree costs image
# size but is correct, and correctness of the migration step matters more here
# than a smaller image.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh \
    && mkdir -p /app/data \
    && chown -R nextjs:nodejs /app/data

USER nextjs

VOLUME ["/app/data"]
EXPOSE 3000

# Docker probes the same /health endpoint a human would, and that endpoint
# queries the database — so an unhealthy database marks the container unhealthy
# rather than leaving it "running" while every request fails.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1:3000/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]

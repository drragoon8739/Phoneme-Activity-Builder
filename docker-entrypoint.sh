#!/bin/sh
# Bring the database up to date, then hand over to the web server.
#
# This runs on every container start rather than only at build time, because
# the database lives on a mounted volume that the image knows nothing about.
# A fresh volume needs the schema and the seed data; an existing one needs any
# migrations added since it was created. Both cases are handled by the same
# two commands, and both are safe to re-run.
set -e

echo "[entrypoint] applying database migrations..."
npx prisma migrate deploy

echo "[entrypoint] seeding reference data (safe to re-run)..."
npx prisma db seed || echo "[entrypoint] seed skipped or already applied"

echo "[entrypoint] starting server on port ${PORT:-3000}"
exec "$@"

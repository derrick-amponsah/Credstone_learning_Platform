#!/bin/sh
# ─────────────────────────────────────────────────────────
# MinIO bucket bootstrap script
# Runs once as an init container using the same minio/minio
# image (which ships mc at /usr/bin/mc internally).
# ─────────────────────────────────────────────────────────

set -e

MINIO_HOST="${S3_ENDPOINT:-http://minio:9000}"
BUCKET="${S3_BUCKET:-credstone-uploads}"
ACCESS_KEY="${S3_ACCESS_KEY:-minioadmin}"
SECRET_KEY="${S3_SECRET_KEY:-minioadmin}"

# Use path to mc (lives in /usr/bin or /usr/local/bin)
MC="$(command -v mc 2>/dev/null || echo /usr/bin/mc)"

echo "⏳ Waiting for MinIO at $MINIO_HOST …"

# Poll until MinIO is ready (max 60 seconds)
for i in $(seq 1 30); do
  if $MC alias set myminio "$MINIO_HOST" "$ACCESS_KEY" "$SECRET_KEY" >/dev/null 2>&1; then
    echo "✅ Connected to MinIO."
    break
  fi
  echo "   attempt $i/30 …"
  sleep 2
done

# Create the bucket if it doesn't already exist
if ! $MC ls "myminio/$BUCKET" >/dev/null 2>&1; then
  $MC mb "myminio/$BUCKET"
  echo "✅ Bucket '$BUCKET' created."
else
  echo "ℹ️  Bucket '$BUCKET' already exists."
fi

# Allow unauthenticated downloads so the API can stream media
$MC anonymous set download "myminio/$BUCKET" 2>/dev/null || true

echo "✅ MinIO initialisation complete."

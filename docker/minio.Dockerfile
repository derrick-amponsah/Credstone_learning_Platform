# ─────────────────────────────────────────────────────────
# MinIO Object Storage image for Credstone Learning
# Uses pre-packaged multi-arch MinIO release with built-in mc
# ─────────────────────────────────────────────────────────
FROM ghcr.io/coollabsio/minio:latest

EXPOSE 9000 9001

ENTRYPOINT ["/usr/bin/minio"]
CMD ["server", "/data", "--console-address", ":9001"]

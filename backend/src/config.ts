import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || 'postgres://credstone:credstone@localhost:5432/credstone',
  redisUrl: process.env.REDIS_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  // S3-compatible Object Storage (MinIO, AWS S3, Cloudflare R2, Wasabi)
  s3Endpoint: process.env.S3_ENDPOINT !== undefined ? process.env.S3_ENDPOINT : 'http://localhost:9000',
  s3Bucket: process.env.S3_BUCKET || 'credstone-uploads',
  s3AccessKey: process.env.S3_ACCESS_KEY || 'minioadmin',
  s3SecretKey: process.env.S3_SECRET_KEY || 'minioadmin',
  s3Region: process.env.S3_REGION || 'us-east-1',
  s3ForcePathStyle: process.env.S3_FORCE_PATH_STYLE !== undefined ? process.env.S3_FORCE_PATH_STYLE === 'true' : true,
  s3PublicUrl: process.env.S3_PUBLIC_URL || '',  // optional CDN / public base URL
  minGroupSize: Number(process.env.MIN_GROUP_SIZE || 5),
  requireSeparateReviewer: process.env.REQUIRE_SEPARATE_REVIEWER !== 'false',
  seedPassword: process.env.SEED_PASSWORD || 'Credstone#2025!',
};


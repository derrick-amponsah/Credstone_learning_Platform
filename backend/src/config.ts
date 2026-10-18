import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || 'postgres://credstone:credstone@localhost:5432/credstone',
  redisUrl: process.env.REDIS_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  minGroupSize: Number(process.env.MIN_GROUP_SIZE || 5),
  requireSeparateReviewer: process.env.REQUIRE_SEPARATE_REVIEWER !== 'false',
  seedPassword: process.env.SEED_PASSWORD || 'Credstone#2025!',
};

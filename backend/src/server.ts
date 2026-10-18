import fs from 'fs';
import path from 'path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import { ZodError } from 'zod';
import { config } from './config';
import { filePath } from './storage';
import auth from './auth';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import learnerRoutes from './routes/learner';
import studioRoutes from './routes/studio';
import assessRoutes from './routes/assess';
import teamRoutes from './routes/team';
import calendarRoutes from './routes/calendar';
import messagesRoutes from './routes/messages';

async function main() {
  const app = Fastify({ logger: true, trustProxy: true });
  await app.register(cors, { origin: config.corsOrigin, credentials: true });
  await app.register(rateLimit, { max: 1000, timeWindow: '1 minute', allowList: ['127.0.0.1', '::1'] });
  await app.register(multipart, { limits: { fileSize: 250 * 1024 * 1024, files: 10 } });
  await app.register(auth);

  // Enterprise Security Headers
  app.addHook('onSend', async (_req, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '1; mode=block');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  });

  app.setErrorHandler((e: any, _req, reply) => {
    if (e instanceof ZodError) return reply.code(400).send({ error: e.issues[0]?.message || 'Check the form and try again.' });
    if (e.statusCode && e.statusCode < 500) return reply.code(e.statusCode).send({ error: e.message });
    app.log.error(e);
    return reply.code(500).send({ error: 'Something went wrong on our side. Try again.' });
  });

  app.get('/health', async () => ({ ok: true }));

  // Media Streaming Endpoint (Supports HTTP Range / 206 for smooth video seeking & HTML5 player)
  app.get('/media/:key', async (req, reply) => {
    const { key } = req.params as any;
    const sanitized = path.basename(key);
    const file = filePath(sanitized);
    if (!fs.existsSync(file)) return reply.code(404).send({ error: 'Media file not found.' });

    const stat = fs.statSync(file);
    const ext = path.extname(sanitized).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.m4v': 'video/x-m4v',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
    };
    const contentType = mimeMap[ext] || 'application/octet-stream';

    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunksize = end - start + 1;
      const stream = fs.createReadStream(file, { start, end });

      reply.code(206);
      reply.header('Content-Range', `bytes ${start}-${end}/${stat.size}`);
      reply.header('Accept-Ranges', 'bytes');
      reply.header('Content-Length', chunksize);
      reply.header('Content-Type', contentType);
      return reply.send(stream);
    }

    reply.header('Content-Length', stat.size);
    reply.header('Content-Type', contentType);
    reply.header('Accept-Ranges', 'bytes');
    return reply.send(fs.createReadStream(file));
  });

  for (const r of [authRoutes, adminRoutes, learnerRoutes, studioRoutes, assessRoutes, teamRoutes, calendarRoutes, messagesRoutes]) await app.register(r);
  await app.listen({ port: config.port, host: '0.0.0.0' });
}
main().catch((e) => { console.error(e); process.exit(1); });

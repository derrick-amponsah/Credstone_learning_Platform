import path from 'path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import { ZodError } from 'zod';
import { config } from './config';
import { getFileStream } from './storage';
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
  // Works transparently with both local disk and S3 / MinIO storage drivers.
  app.get('/media/:key', async (req, reply) => {
    const { key } = req.params as any;
    const result = await getFileStream(key, req.headers.range);
    if (!result) return reply.code(404).send({ error: 'Media file not found.' });

    const { stream, size, contentType, start, end, isPartial } = result;
    reply.header('Content-Type', contentType);
    reply.header('Accept-Ranges', 'bytes');
    reply.header('Content-Disposition', `inline; filename="${path.basename(key)}"`);

    if (isPartial && start !== undefined && end !== undefined) {
      const chunksize = end - start + 1;
      reply.code(206);
      reply.header('Content-Range', `bytes ${start}-${end}/${size}`);
      reply.header('Content-Length', chunksize);
    } else {
      reply.header('Content-Length', size);
    }
    return reply.send(stream);
  });

  for (const r of [authRoutes, adminRoutes, learnerRoutes, studioRoutes, assessRoutes, teamRoutes, calendarRoutes, messagesRoutes]) await app.register(r);
  await app.listen({ port: config.port, host: '0.0.0.0' });
}
main().catch((e) => { console.error(e); process.exit(1); });

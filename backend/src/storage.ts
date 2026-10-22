import path from 'path';
import crypto from 'crypto';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { config } from './config';

const ALLOWED = ['.pdf', '.ppt', '.pptx', '.doc', '.docx', '.txt', '.mp4', '.webm', '.mov', '.m4v'];
const fail = (msg: string) => Object.assign(new Error(msg), { statusCode: 400 });

const MIME_MAP: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.m4v': 'video/x-m4v',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

// ────────────────────────────────────────────────────────
// S3 / MinIO Client Singleton
// ────────────────────────────────────────────────────────
let s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      ...(config.s3Endpoint ? { endpoint: config.s3Endpoint } : {}),
      region: config.s3Region,
      credentials: {
        accessKeyId: config.s3AccessKey,
        secretAccessKey: config.s3SecretKey,
      },
      forcePathStyle: config.s3ForcePathStyle,
    });
  }
  return s3Client;
}

// ────────────────────────────────────────────────────────
// saveFile: uploads multipart stream directly into MinIO / S3
// ────────────────────────────────────────────────────────
export async function saveFile(part: any): Promise<{ name: string; key: string; excerpt: string | null }> {
  const ext = path.extname(part.filename || '').toLowerCase();
  if (!ALLOWED.includes(ext)) {
    throw fail('That file type is not supported. Use PDF, PPT, DOC, DOCX, TXT, MP4, WEBM or MOV.');
  }

  const key = `${crypto.randomUUID()}${ext}`;
  let excerpt: string | null = null;

  // Stream chunks into buffer (supports files up to 250 MB via Fastify multipart)
  const chunks: Buffer[] = [];
  for await (const chunk of part.file) {
    chunks.push(chunk as Buffer);
  }
  const buf = Buffer.concat(chunks);

  if (part.file.truncated) {
    throw fail('That file is larger than 250 MB.');
  }

  if (ext === '.txt') {
    excerpt = buf.toString('utf8').slice(0, 800);
  }

  const contentType = MIME_MAP[ext] || 'application/octet-stream';

  await getS3Client().send(new PutObjectCommand({
    Bucket: config.s3Bucket,
    Key: key,
    Body: buf,
    ContentType: contentType,
    ContentLength: buf.length,
  }));

  return { name: part.filename as string, key, excerpt };
}

// ────────────────────────────────────────────────────────
// deleteFile: removes an object from MinIO / S3
// ────────────────────────────────────────────────────────
export function deleteFile(key?: string | null): void {
  if (!key) return;
  const cleanKey = path.basename(key);
  getS3Client()
    .send(new DeleteObjectCommand({ Bucket: config.s3Bucket, Key: cleanKey }))
    .catch(() => {
      // Fire-and-forget: failure to delete from S3 does not block the caller
    });
}

// ────────────────────────────────────────────────────────
// getFileStream: streams an object from MinIO / S3
// Supports HTTP 206 Range requests for smooth video scrubbing & partial downloads
// ────────────────────────────────────────────────────────
export async function getFileStream(key: string, range?: string): Promise<{
  stream: NodeJS.ReadableStream;
  size: number;
  contentType: string;
  start?: number;
  end?: number;
  isPartial: boolean;
} | null> {
  const cleanKey = path.basename(key);
  const ext = path.extname(cleanKey).toLowerCase();
  const contentType = MIME_MAP[ext] || 'application/octet-stream';

  let size: number;
  try {
    const head = await getS3Client().send(
      new HeadObjectCommand({ Bucket: config.s3Bucket, Key: cleanKey })
    );
    size = head.ContentLength ?? 0;
  } catch {
    return null;
  }

  let start: number | undefined;
  let end: number | undefined;
  let isPartial = false;
  let s3Range: string | undefined;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    start = parseInt(parts[0], 10);
    end = parts[1] ? parseInt(parts[1], 10) : size - 1;
    isPartial = true;
    s3Range = `bytes=${start}-${end}`;
  }

  const resp = await getS3Client().send(new GetObjectCommand({
    Bucket: config.s3Bucket,
    Key: cleanKey,
    Range: s3Range,
  }));

  const stream = resp.Body as NodeJS.ReadableStream;
  return { stream, size, contentType, start, end, isPartial };
}

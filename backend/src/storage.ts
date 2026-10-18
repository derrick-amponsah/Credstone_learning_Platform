import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pipeline } from 'stream/promises';
import { config } from './config';

// Local disk implementation. Replace saveFile/filePath with an S3-compatible client (and CDN URLs) in production.
const ALLOWED = ['.pdf', '.ppt', '.pptx', '.doc', '.docx', '.txt', '.mp4', '.webm', '.mov', '.m4v'];
const fail = (msg: string) => Object.assign(new Error(msg), { statusCode: 400 });

export async function saveFile(part: any) {
  const ext = path.extname(part.filename || '').toLowerCase();
  if (!ALLOWED.includes(ext)) throw fail('That file type is not supported. Use PDF, PPT, DOC, DOCX, TXT, MP4, WEBM or MOV.');
  fs.mkdirSync(config.uploadDir, { recursive: true });
  const key = crypto.randomUUID() + ext;
  const dest = path.join(config.uploadDir, key);
  await pipeline(part.file, fs.createWriteStream(dest));
  if (part.file.truncated) {
    fs.unlinkSync(dest);
    throw fail('That file is larger than 250 MB.');
  }
  let excerpt: string | null = null;
  if (ext === '.txt') excerpt = fs.readFileSync(dest, 'utf8').slice(0, 800);
  return { name: part.filename as string, key, excerpt };
}

export const filePath = (key: string) => path.join(config.uploadDir, path.basename(key));

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

export function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
};

export async function saveUploadedFile(
  file: File,
  prefix = 'img'
): Promise<string> {
  ensureUploadsDir();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let ext = MIME_TO_EXT[file.type.toLowerCase()];
  if (!ext) {
    const origExt = path.extname(file.name).toLowerCase();
    ext = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(origExt)
      ? origExt
      : '.png';
  }

  const safeName = `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
  const destPath = path.join(UPLOADS_DIR, safeName);
  fs.writeFileSync(destPath, buffer);
  return `/uploads/${safeName}`;
}

export function saveBase64Signature(
  dataUrl: string,
  prefix = 'sig'
): string | null {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return null;
  ensureUploadsDir();
  const matches = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,(.+)$/);
  if (!matches) return null;

  const rawExt = matches[1] === 'svg+xml' ? 'svg' : matches[1] === 'jpeg' ? 'jpg' : matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');

  const safeName = `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${rawExt}`;
  const destPath = path.join(UPLOADS_DIR, safeName);
  fs.writeFileSync(destPath, buffer);
  return `/uploads/${safeName}`;
}


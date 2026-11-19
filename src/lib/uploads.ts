import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { isPostgres, saveFileToDb, deleteFileFromDb } from '@/db';

const IS_VERCEL = Boolean(process.env.VERCEL);
export const PUBLIC_UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
export const UPLOADS_DIR = IS_VERCEL
  ? path.join('/tmp', 'techcare-uploads')
  : PUBLIC_UPLOADS_DIR;

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

const EXT_TO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

export async function saveUploadedFile(
  file: File,
  prefix = 'img'
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let ext = MIME_TO_EXT[file.type.toLowerCase()];
  if (!ext) {
    const origExt = path.extname(file.name).toLowerCase();
    ext = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(origExt)
      ? origExt
      : '.png';
  }

  const mimeType = EXT_TO_MIME[ext] || file.type || 'image/png';
  const safeName = `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;

  if (isPostgres() || IS_VERCEL) {
    await saveFileToDb(safeName, mimeType, buffer);
  }

  try {
    ensureUploadsDir();
    fs.writeFileSync(path.join(UPLOADS_DIR, safeName), buffer);
  } catch {
    // Fallback cleanly if filesystem is read-only
  }

  return `/uploads/${safeName}`;
}

export async function saveBase64Signature(
  dataUrl: string,
  prefix = 'sig'
): Promise<string | null> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return null;
  const matches = dataUrl.match(
    /^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,(.+)$/
  );
  if (!matches) return null;

  const rawExt =
    matches[1] === 'svg+xml'
      ? 'svg'
      : matches[1] === 'jpeg'
      ? 'jpg'
      : matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');
  const ext = `.${rawExt}`;
  const mimeType = EXT_TO_MIME[ext] || 'image/png';

  const safeName = `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;

  if (isPostgres() || IS_VERCEL) {
    await saveFileToDb(safeName, mimeType, buffer);
  }

  try {
    ensureUploadsDir();
    fs.writeFileSync(path.join(UPLOADS_DIR, safeName), buffer);
  } catch {
    // Fallback cleanly if filesystem is read-only
  }

  return `/uploads/${safeName}`;
}

export async function deleteUploadedFile(filePath: string | null | undefined) {
  if (!filePath || !filePath.startsWith('/uploads/')) return;
  const safeName = path.basename(filePath);
  await deleteFileFromDb(filePath);
  for (const dir of [UPLOADS_DIR, PUBLIC_UPLOADS_DIR]) {
    const fullPath = path.join(dir, safeName);
    try {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch {
      // Ignore read-only paths on serverless deployments
    }
  }
}

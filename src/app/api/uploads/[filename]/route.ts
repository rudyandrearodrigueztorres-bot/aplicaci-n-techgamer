import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { PUBLIC_UPLOADS_DIR, UPLOADS_DIR } from '@/lib/uploads';

const EXT_TO_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  const { filename } = await context.params;
  const safeName = path.basename(filename);
  const runtimePath = path.join(UPLOADS_DIR, safeName);
  const publicPath = path.join(PUBLIC_UPLOADS_DIR, safeName);
  const fullPath = fs.existsSync(runtimePath) ? runtimePath : publicPath;

  if (!fs.existsSync(fullPath)) {
    return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
  }

  const ext = path.extname(safeName).toLowerCase();
  const contentType = EXT_TO_MIME[ext] || 'application/octet-stream';
  const fileBuffer = fs.readFileSync(fullPath);

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}


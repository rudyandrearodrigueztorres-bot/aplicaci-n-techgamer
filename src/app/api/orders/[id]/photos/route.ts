import { NextRequest, NextResponse } from 'next/server';
import { getDb, getOrderWithDetails, type DbOrder } from '@/db';
import { getSession } from '@/lib/auth';
import type { PhotoCategory } from '@/lib/constants';
import { saveUploadedFile } from '@/lib/uploads';

const VALID_CATEGORIES: PhotoCategory[] = [
  'RECEPCION',
  'DIAGNOSTICO',
  'REPARACION',
  'PRUEBAS',
  'PROCESO',
];

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'TECHNICIAN') {
    return NextResponse.json(
      { error: 'Acceso restringido al rol Técnico' },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return NextResponse.json({ error: 'ID de orden inválido' }, { status: 400 });
  }

  const db = getDb();
  const order = db
    .prepare(`SELECT * FROM orders WHERE id = ?`)
    .get(orderId) as DbOrder | undefined;

  if (!order) {
    return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
  }

  try {
    const formData = await req.formData();
    const rawCategory = String(formData.get('category') || 'PROCESO') as PhotoCategory;
    const category: PhotoCategory = VALID_CATEGORIES.includes(rawCategory)
      ? rawCategory
      : 'PROCESO';
    const caption = String(formData.get('caption') || '').trim();
    const rawPhotos = formData.getAll('photos');
    const photoFiles = rawPhotos.filter(
      (f): f is File =>
        typeof f === 'object' && f !== null && 'arrayBuffer' in f && f.size > 0
    );

    if (photoFiles.length === 0) {
      return NextResponse.json(
        { error: 'Selecciona al menos una fotografía para subir.' },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const insertPhotoStmt = db.prepare(
      `INSERT INTO order_photos (order_id, log_id, file_path, caption, category, created_at)
       VALUES (?, NULL, ?, ?, ?, ?)`
    );

    for (const file of photoFiles) {
      const filePath = await saveUploadedFile(file, `evidencia-${orderId}`);
      insertPhotoStmt.run(
        orderId,
        filePath,
        caption || file.name.replace(/\.[^.]+$/, ''),
        category,
        nowIso
      );
    }

    db.prepare(`UPDATE orders SET updated_at = ? WHERE id = ?`).run(
      nowIso,
      orderId
    );

    const updated = getOrderWithDetails(orderId);
    return NextResponse.json({ order: updated }, { status: 201 });
  } catch (error) {
    console.error('Upload photos error:', error);
    return NextResponse.json(
      { error: 'Error al subir las imágenes.' },
      { status: 500 }
    );
  }
}


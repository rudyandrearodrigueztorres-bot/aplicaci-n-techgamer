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
    const comment = String(formData.get('comment') || '').trim();
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

    if (!comment && photoFiles.length === 0) {
      return NextResponse.json(
        { error: 'Escribe un comentario técnico o adjunta al menos una imagen.' },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const finalComment =
      comment ||
      `Se han añadido ${photoFiles.length} evidencia(s) fotográfica(s) del proceso técnico.`;

    const logRes = db
      .prepare(
        `INSERT INTO order_logs (order_id, author_name, comment, status_at_time, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(orderId, session.fullName, finalComment, order.status, nowIso);

    const logId = Number(logRes.lastInsertRowid);

    const insertPhotoStmt = db.prepare(
      `INSERT INTO order_photos (order_id, log_id, file_path, caption, category, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    for (const file of photoFiles) {
      const filePath = await saveUploadedFile(file, `orden-${orderId}`);
      insertPhotoStmt.run(
        orderId,
        logId,
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
    console.error('Add log error:', error);
    return NextResponse.json(
      { error: 'Error al registrar entrada en la bitácora.' },
      { status: 500 }
    );
  }
}


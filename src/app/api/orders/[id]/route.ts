import { NextRequest, NextResponse } from 'next/server';
import {
  deleteOrderAndAssets,
  getDb,
  getOrderWithDetails,
  purgeExpiredOrders,
  type DbOrder,
} from '@/db';
import { getSession } from '@/lib/auth';
import { getStatusInfo, type OrderStatus } from '@/lib/constants';
import { seedDatabase } from '@/db/seed';

const VALID_STATUSES: OrderStatus[] = [
  'EN_DIAGNOSTICO',
  'DIAGNOSTICADO',
  'EN_REPARACION',
  'LISTO_PARA_ENTREGA',
  'ENTREGADO',
];

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  seedDatabase(false);
  purgeExpiredOrders();
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { id } = await context.params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return NextResponse.json({ error: 'ID de orden inválido' }, { status: 400 });
  }

  const order = getOrderWithDetails(orderId);
  if (!order) {
    return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
  }

  if (session.role === 'CLIENT' && order.client_user_id !== session.userId) {
    return NextResponse.json(
      { error: 'No tienes permiso para acceder a esta orden' },
      { status: 403 }
    );
  }

  return NextResponse.json({ order });
}

export async function PATCH(
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
  const existing = db
    .prepare(`SELECT * FROM orders WHERE id = ?`)
    .get(orderId) as DbOrder | undefined;

  if (!existing) {
    return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const nowIso = new Date().toISOString();

    let nextStatus: OrderStatus = existing.status;
    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
      }
      nextStatus = body.status;
    }

    const finalDiagnosis =
      body.final_diagnosis !== undefined
        ? String(body.final_diagnosis).trim() || null
        : existing.final_diagnosis;

    const solutionApplied =
      body.solution_applied !== undefined
        ? String(body.solution_applied).trim() || null
        : existing.solution_applied;

    const warrantyGranted =
      body.warranty_granted !== undefined
        ? String(body.warranty_granted).trim() || null
        : existing.warranty_granted;

    let completedAt = existing.completed_at;
    let deliveredAt = existing.delivered_at;

    if (
      (nextStatus === 'LISTO_PARA_ENTREGA' || nextStatus === 'ENTREGADO') &&
      !completedAt
    ) {
      completedAt = nowIso;
    }
    if (nextStatus === 'ENTREGADO' && !deliveredAt) {
      deliveredAt = nowIso;
    }

    db.prepare(
      `UPDATE orders
       SET status = ?,
           final_diagnosis = ?,
           solution_applied = ?,
           warranty_granted = ?,
           completed_at = ?,
           delivered_at = ?,
           technician_name = ?,
           updated_at = ?
       WHERE id = ?`
    ).run(
      nextStatus,
      finalDiagnosis,
      solutionApplied,
      warrantyGranted,
      completedAt,
      deliveredAt,
      session.fullName,
      nowIso,
      orderId
    );

    if (nextStatus !== existing.status) {
      const statusLabel = getStatusInfo(nextStatus).label;
      db.prepare(
        `INSERT INTO order_logs (order_id, author_name, comment, status_at_time, created_at)
         VALUES (?, ?, ?, ?, ?)`
      ).run(
        orderId,
        session.fullName,
        `Actualización de estado: el equipo ha pasado a fase "${statusLabel}".`,
        nextStatus,
        nowIso
      );
    }

    const updated = getOrderWithDetails(orderId);
    return NextResponse.json({ order: updated });
  } catch (error) {
    console.error('Update order error:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la orden.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
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

  try {
    const deleted = deleteOrderAndAssets(orderId);
    if (!deleted) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ deleted: true, id: orderId });
  } catch (error) {
    console.error('Delete order error:', error);
    return NextResponse.json(
      { error: 'Error al eliminar la orden.' },
      { status: 500 }
    );
  }
}


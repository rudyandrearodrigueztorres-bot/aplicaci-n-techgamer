import { NextRequest, NextResponse } from 'next/server';
import { getOrderWithDetails, purgeExpiredOrders } from '@/db';
import { seedDatabase } from '@/db/seed';
import { getSession } from '@/lib/auth';
import { generateOrderPdf } from '@/lib/pdf';

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
      { error: 'No tienes permiso para descargar este registro' },
      { status: 403 }
    );
  }

  try {
    const pdfBytes = await generateOrderPdf(order);
    const filename = `Registro-Digital-${order.order_number}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'No se pudo generar el PDF del registro digital.' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getDb, getOrderWithDetails, type DbOrder } from '@/db';
import { getSession } from '@/lib/auth';
import { CONSENT_VERSION } from '@/lib/constants';
import { saveBase64Signature } from '@/lib/uploads';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
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

  if (session.role === 'CLIENT' && order.client_user_id !== session.userId) {
    return NextResponse.json(
      { error: 'No tienes permiso para firmar esta orden.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const accepted = Boolean(body.accepted);
    const signerName = String(body.signerName || order.client_name).trim();
    const signatureDataUrl = String(body.signatureDataUrl || '');

    if (!accepted) {
      return NextResponse.json(
        {
          error:
            'Debes aceptar expresamente la Política de Privacidad y las Condiciones del Servicio.',
        },
        { status: 400 }
      );
    }

    if (!signerName) {
      return NextResponse.json(
        { error: 'Indica el nombre completo de quien otorga el consentimiento.' },
        { status: 400 }
      );
    }

    let signaturePath: string | null = order.consent_signature_path;
    if (signatureDataUrl && signatureDataUrl.startsWith('data:image/')) {
      signaturePath = saveBase64Signature(signatureDataUrl, `firma-orden-${orderId}`);
    }

    const nowIso = new Date().toISOString();
    const method = session.role === 'CLIENT' ? 'PORTAL_CLIENTE' : 'PRESENCIAL';

    db.prepare(
      `UPDATE orders
       SET consent_accepted = 1,
           consent_accepted_at = ?,
           consent_method = ?,
           consent_signature_path = ?,
           consent_signer_name = ?,
           consent_version = ?,
           updated_at = ?
       WHERE id = ?`
    ).run(
      nowIso,
      method,
      signaturePath,
      signerName,
      CONSENT_VERSION,
      nowIso,
      orderId
    );

    const logComment =
      method === 'PORTAL_CLIENTE'
        ? `Consentimiento de Protección de Datos (RGPD) y Condiciones del Servicio aceptado digitalmente por ${signerName} desde el Portal del Cliente.`
        : `Consentimiento de Protección de Datos (RGPD) y Condiciones del Servicio firmado presencialmente por ${signerName}.`;

    db.prepare(
      `INSERT INTO order_logs (order_id, author_name, comment, status_at_time, created_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(orderId, signerName, logComment, order.status, nowIso);

    const updated = getOrderWithDetails(orderId);
    return NextResponse.json({ order: updated });
  } catch (error) {
    console.error('Consent acceptance error:', error);
    return NextResponse.json(
      { error: 'Error al registrar la aceptación de datos.' },
      { status: 500 }
    );
  }
}


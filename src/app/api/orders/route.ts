import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  execute,
  generateNextOrderNumber,
  getOrderWithDetails,
  insertReturningId,
  purgeExpiredOrders,
  queryAll,
  queryOne,
  type DbOrder,
} from '@/db';
import { clearSessionCookie, getSession, hashPassword } from '@/lib/auth';
import {
  CONSENT_VERSION,
  calculateExpiresAt,
  isClientAccessExpired,
} from '@/lib/constants';
import { saveBase64Signature, saveUploadedFile } from '@/lib/uploads';
import { seedDatabase } from '@/db/seed';

export async function GET(req: NextRequest) {
  await seedDatabase(false);
  await purgeExpiredOrders();
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim().toLowerCase();
  const status = (searchParams.get('status') || '').trim();

  if (session.role === 'CLIENT') {
    const orders = await queryAll<DbOrder & { client_username: string }>(
      `SELECT o.*, u.username AS client_username
       FROM orders o
       JOIN users u ON u.id = o.client_user_id
       WHERE o.client_user_id = ?
       ORDER BY o.received_at DESC`,
      [session.userId]
    );

    const activeOrders = orders.filter((o) => !isClientAccessExpired(o));
    if (orders.length > 0 && activeOrders.length === 0) {
      await clearSessionCookie();
      return NextResponse.json(
        {
          error: 'ACCESS_EXPIRED',
          message:
            'Tu acceso al portal expiró 2 días después de la entrega del equipo.',
        },
        { status: 403 }
      );
    }

    const detailed = (
      await Promise.all(activeOrders.map((o) => getOrderWithDetails(o.id)))
    ).filter(Boolean);

    return NextResponse.json({ orders: detailed });
  }

  // TECHNICIAN: can view all orders with search & status filters
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (q) {
    conditions.push(
      `(LOWER(o.order_number) LIKE ? OR LOWER(o.client_name) LIKE ? OR LOWER(o.device_brand) LIKE ? OR LOWER(o.device_model) LIKE ? OR LOWER(o.device_serial) LIKE ? OR LOWER(COALESCE(u.username, '')) LIKE ?)`
    );
    const pattern = `%${q}%`;
    params.push(pattern, pattern, pattern, pattern, pattern, pattern);
  }

  if (status && status !== 'ALL') {
    conditions.push(`o.status = ?`);
    params.push(status);
  }

  const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const orders = await queryAll<Record<string, unknown>>(
    `SELECT o.*, u.username AS client_username,
            (SELECT COUNT(*) FROM order_logs l WHERE l.order_id = o.id) AS logs_count,
            (SELECT COUNT(*) FROM order_photos p WHERE p.order_id = o.id) AS photos_count
     FROM orders o
     LEFT JOIN users u ON u.id = o.client_user_id
     ${whereSql}
     ORDER BY o.received_at DESC, o.id DESC`,
    params
  );

  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  await seedDatabase(false);
  const session = await getSession();
  if (!session || session.role !== 'TECHNICIAN') {
    return NextResponse.json(
      { error: 'Acceso restringido al rol Técnico' },
      { status: 403 }
    );
  }

  try {
    const formData = await req.formData();

    const clientName = String(formData.get('clientName') || '').trim();
    const clientPhone = String(formData.get('clientPhone') || '').trim();
    const clientEmail = String(formData.get('clientEmail') || '').trim();
    const rawUsername = String(formData.get('clientUsername') || '')
      .trim()
      .toLowerCase();
    const clientPassword = String(formData.get('clientPassword') || '').trim();

    const deviceBrand = String(formData.get('deviceBrand') || '').trim();
    const deviceModel = String(formData.get('deviceModel') || '').trim();
    const deviceSerial = String(formData.get('deviceSerial') || '').trim();
    const reportedIssue = String(formData.get('reportedIssue') || '').trim();

    const consentMode = String(formData.get('consentMode') || 'PRESENCIAL');
    const consentAccepted = formData.get('consentAccepted') === 'true';
    const consentSignature = String(formData.get('consentSignature') || '');
    const initialPhotoEntry = formData.get('initialPhoto');

    if (
      !clientName ||
      !clientPhone ||
      !clientEmail ||
      !rawUsername ||
      !clientPassword ||
      !deviceBrand ||
      !deviceModel ||
      !deviceSerial ||
      !reportedIssue
    ) {
      return NextResponse.json(
        { error: 'Completa todos los campos obligatorios del cliente y del equipo.' },
        { status: 400 }
      );
    }

    if (clientPassword.length < 4) {
      return NextResponse.json(
        { error: 'La contraseña temporal del cliente debe tener al menos 4 caracteres.' },
        { status: 400 }
      );
    }

    if (consentMode === 'PRESENCIAL') {
      if (!consentAccepted) {
        return NextResponse.json(
          {
            error:
              'Para el registro presencial es obligatorio marcar la casilla de aceptación de datos y condiciones del servicio.',
          },
          { status: 400 }
        );
      }
      if (!consentSignature || !consentSignature.startsWith('data:image/')) {
        return NextResponse.json(
          {
            error:
              'Para el registro presencial es obligatoria la firma digital en pantalla.',
          },
          { status: 400 }
        );
      }
    }

    const existingUser = await queryOne<{ id: number }>(
      `SELECT id FROM users WHERE LOWER(username) = ?`,
      [rawUsername]
    );

    if (existingUser) {
      return NextResponse.json(
        {
          error: `El usuario "${rawUsername}" ya existe en el sistema. Genera o escribe otro nombre de usuario para esta orden.`,
        },
        { status: 409 }
      );
    }

    let initialPhotoPath: string | null = null;
    if (
      initialPhotoEntry &&
      typeof initialPhotoEntry === 'object' &&
      'arrayBuffer' in initialPhotoEntry &&
      initialPhotoEntry.size > 0
    ) {
      initialPhotoPath = await saveUploadedFile(
        initialPhotoEntry as File,
        'recepcion'
      );
    }

    let signaturePath: string | null = null;
    if (consentMode === 'PRESENCIAL' && consentAccepted && consentSignature) {
      signaturePath = await saveBase64Signature(
        consentSignature,
        'firma-recepcion'
      );
    }

    const nowIso = new Date().toISOString();
    const expiresAtIso = calculateExpiresAt(nowIso);
    const orderNumber = await generateNextOrderNumber();
    const certHash = crypto.randomBytes(2).toString('hex').toUpperCase();
    const orderSeq = orderNumber.split('-').pop() || '0000';
    const certificateCode = `CERT-TC${String(new Date().getFullYear()).slice(-2)}-${certHash}-${orderSeq}`;

    const clientUserId = await insertReturningId(
      `INSERT INTO users (username, password_hash, role, full_name, email, phone, created_at)
       VALUES (?, ?, 'CLIENT', ?, ?, ?, ?)`,
      [
        rawUsername,
        hashPassword(clientPassword),
        clientName,
        clientEmail,
        clientPhone,
        nowIso,
      ]
    );

    const isPresencialSigned =
      consentMode === 'PRESENCIAL' && consentAccepted && Boolean(signaturePath);

    const newOrderId = await insertReturningId(
      `INSERT INTO orders (
        order_number, client_user_id, client_name, client_phone, client_email, client_temp_password,
        device_brand, device_model, device_serial, reported_issue, status,
        received_at, initial_photo_path,
        consent_accepted, consent_accepted_at, consent_method, consent_signature_path, consent_signer_name, consent_version,
        technician_name, certificate_code, expires_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'EN_DIAGNOSTICO', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderNumber,
        clientUserId,
        clientName,
        clientPhone,
        clientEmail,
        clientPassword,
        deviceBrand,
        deviceModel,
        deviceSerial,
        reportedIssue,
        nowIso,
        initialPhotoPath,
        isPresencialSigned ? 1 : 0,
        isPresencialSigned ? nowIso : null,
        isPresencialSigned ? 'PRESENCIAL' : null,
        signaturePath,
        isPresencialSigned ? clientName : null,
        CONSENT_VERSION,
        session.fullName,
        certificateCode,
        expiresAtIso,
        nowIso,
      ]
    );

    const initialComment = isPresencialSigned
      ? `Equipo ingresado en taller por ${clientName}. Consentimiento de Protección de Datos y Condiciones del Servicio firmado presencialmente en mostrador.`
      : `Equipo ingresado en taller para ${clientName}. Aceptación de Protección de Datos y Condiciones del Servicio pendiente para el primer acceso del cliente al portal.`;

    await execute(
      `INSERT INTO order_logs (order_id, author_name, comment, status_at_time, created_at)
       VALUES (?, ?, ?, 'EN_DIAGNOSTICO', ?)`,
      [newOrderId, session.fullName, initialComment, nowIso]
    );

    const createdOrder = await getOrderWithDetails(newOrderId);

    return NextResponse.json(
      {
        order: createdOrder,
        credentials: {
          username: rawUsername,
          password: clientPassword,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { error: 'Error al registrar la orden de ingreso.' },
      { status: 500 }
    );
  }
}

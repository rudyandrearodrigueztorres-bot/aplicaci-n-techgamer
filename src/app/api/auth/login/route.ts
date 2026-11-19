import { NextRequest, NextResponse } from 'next/server';
import {
  purgeExpiredOrders,
  queryAll,
  queryOne,
  type DbOrder,
  type DbUser,
} from '@/db';
import { setSessionCookie, verifyPassword } from '@/lib/auth';
import { isClientAccessExpired } from '@/lib/constants';
import { seedDatabase } from '@/db/seed';

export async function POST(req: NextRequest) {
  try {
    await seedDatabase(false);
    await purgeExpiredOrders();

    const body = await req.json();
    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Ingresa tu usuario y contraseña.' },
        { status: 400 }
      );
    }

    const user = await queryOne<DbUser>(
      `SELECT * FROM users WHERE LOWER(username) = ?`,
      [username]
    );

    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json(
        { error: 'Credenciales incorrectas. Verifica tu usuario y contraseña.' },
        { status: 401 }
      );
    }

    // Enforce 2-day post-delivery access window for CLIENT users
    if (user.role === 'CLIENT') {
      const clientOrders = await queryAll<Pick<DbOrder, 'status' | 'delivered_at'>>(
        `SELECT status, delivered_at FROM orders WHERE client_user_id = ?`,
        [user.id]
      );

      if (clientOrders.length === 0) {
        return NextResponse.json(
          {
            error:
              'No existe ninguna orden activa asociada a este usuario. Contacta con Tech Gamer.',
          },
          { status: 403 }
        );
      }

      const hasActiveAccess = clientOrders.some(
        (order) => !isClientAccessExpired(order)
      );

      if (!hasActiveAccess) {
        return NextResponse.json(
          {
            error:
              'Tu acceso temporal expiró 2 días después de la entrega del equipo. Contacta con Tech Gamer si necesitas una copia de tu certificado.',
          },
          { status: 403 }
        );
      }
    }

    await setSessionCookie({
      userId: user.id,
      username: user.username,
      role: user.role,
      fullName: user.full_name,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.full_name,
      },
      redirectTo: user.role === 'TECHNICIAN' ? '/tecnico' : '/cliente',
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Error interno al iniciar sesión.' },
      { status: 500 }
    );
  }
}

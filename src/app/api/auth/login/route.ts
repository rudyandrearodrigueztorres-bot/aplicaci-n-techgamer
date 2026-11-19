import { NextRequest, NextResponse } from 'next/server';
import { getDb, purgeExpiredOrders, type DbUser } from '@/db';
import { setSessionCookie, verifyPassword } from '@/lib/auth';
import { seedDatabase } from '@/db/seed';

export async function POST(req: NextRequest) {
  try {
    seedDatabase(false);
    purgeExpiredOrders();

    const body = await req.json();
    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Ingresa tu usuario y contraseña.' },
        { status: 400 }
      );
    }

    const db = getDb();
    const user = db
      .prepare(`SELECT * FROM users WHERE LOWER(username) = ?`)
      .get(username) as DbUser | undefined;

    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json(
        { error: 'Credenciales incorrectas. Verifica tu usuario y contraseña.' },
        { status: 401 }
      );
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


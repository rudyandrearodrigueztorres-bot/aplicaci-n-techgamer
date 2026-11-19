import crypto from 'crypto';
import { cookies } from 'next/headers';

export type UserRole = 'TECHNICIAN' | 'CLIENT';

export interface SessionPayload {
  userId: number;
  username: string;
  role: UserRole;
  fullName: string;
  exp: number;
}

const SESSION_COOKIE_NAME = 'techcare_session';
const SESSION_SECRET =
  process.env.SESSION_SECRET || 'techcare-lab-local-secret-key-2026-x9p4q7';
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 days (client access strictly checked against delivered_at + 2 days)

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(derived, storedBuf);
}

function signData(data: string): string {
  return crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(data)
    .digest('base64url');
}

export function createSessionToken(
  payload: Omit<SessionPayload, 'exp'>
): string {
  const fullPayload: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const sig = signData(encoded);
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encoded, sig] = parts;
    const expectedSig = signData(encoded);
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

    const decoded = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as SessionPayload;
    if (!decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const session = verifySessionToken(token);
  if (!session) return null;
  if (
    session.role === 'TECHNICIAN' &&
    (session.fullName === 'Ing. Alejandro Morales' ||
      session.fullName === 'Administrador Técnico')
  ) {
    return {
      ...session,
      fullName: process.env.ADMIN_NAME || 'Técnico Miguel Gómez',
    };
  }
  return session;
}

export async function setSessionCookie(payload: Omit<SessionPayload, 'exp'>) {
  const token = createSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: Boolean(process.env.VERCEL),
    path: '/',
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: Boolean(process.env.VERCEL),
    path: '/',
    maxAge: 0,
  });
}


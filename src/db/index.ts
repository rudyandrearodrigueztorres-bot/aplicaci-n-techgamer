import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import {
  calculateExpiresAt,
  type ConsentMethod,
  type OrderStatus,
  type PhotoCategory,
} from '@/lib/constants';
import type { UserRole } from '@/lib/auth';
import { deleteUploadedFile } from '@/lib/uploads';

export interface DbUser {
  id: number;
  username: string;
  password_hash: string;
  role: UserRole;
  full_name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
}

export interface DbOrder {
  id: number;
  order_number: string;
  client_user_id: number;
  client_name: string;
  client_phone: string;
  client_email: string;
  client_temp_password: string | null;
  device_brand: string;
  device_model: string;
  device_serial: string;
  reported_issue: string;
  status: OrderStatus;
  received_at: string;
  completed_at: string | null;
  delivered_at: string | null;
  initial_photo_path: string | null;
  consent_accepted: number;
  consent_accepted_at: string | null;
  consent_method: ConsentMethod | null;
  consent_signature_path: string | null;
  consent_signer_name: string | null;
  consent_version: string;
  final_diagnosis: string | null;
  solution_applied: string | null;
  warranty_granted: string | null;
  technician_name: string | null;
  certificate_code: string;
  expires_at: string;
  updated_at: string;
}

export interface DbOrderLog {
  id: number;
  order_id: number;
  author_name: string;
  comment: string;
  status_at_time: OrderStatus | null;
  created_at: string;
}

export interface DbOrderPhoto {
  id: number;
  order_id: number;
  log_id: number | null;
  file_path: string;
  caption: string | null;
  category: PhotoCategory;
  created_at: string;
}

export interface OrderWithDetails extends DbOrder {
  client_username: string;
  logs: (DbOrderLog & { photos: DbOrderPhoto[] })[];
  photos: DbOrderPhoto[];
}

const IS_VERCEL = Boolean(process.env.VERCEL);
const DATA_DIR = IS_VERCEL
  ? path.join('/tmp', 'techcare-data')
  : path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'taller.db');

declare global {
  // eslint-disable-next-line no-var
  var __techcareDb: DatabaseSync | undefined;
}

function initSchema(db: DatabaseSync) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('TECHNICIAN', 'CLIENT')),
      full_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      client_user_id INTEGER NOT NULL,
      client_name TEXT NOT NULL,
      client_phone TEXT NOT NULL,
      client_email TEXT NOT NULL,
      client_temp_password TEXT,
      device_brand TEXT NOT NULL,
      device_model TEXT NOT NULL,
      device_serial TEXT NOT NULL,
      reported_issue TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'EN_DIAGNOSTICO'
        CHECK(status IN ('EN_DIAGNOSTICO', 'DIAGNOSTICADO', 'EN_REPARACION', 'LISTO_PARA_ENTREGA', 'ENTREGADO')),
      received_at TEXT NOT NULL,
      completed_at TEXT,
      delivered_at TEXT,
      initial_photo_path TEXT,
      consent_accepted INTEGER NOT NULL DEFAULT 0,
      consent_accepted_at TEXT,
      consent_method TEXT CHECK(consent_method IN ('PRESENCIAL', 'PORTAL_CLIENTE') OR consent_method IS NULL),
      consent_signature_path TEXT,
      consent_signer_name TEXT,
      consent_version TEXT NOT NULL DEFAULT 'v2.0-RGPD-2026',
      final_diagnosis TEXT,
      solution_applied TEXT,
      warranty_granted TEXT,
      technician_name TEXT,
      certificate_code TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (client_user_id) REFERENCES users(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS order_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      author_name TEXT NOT NULL,
      comment TEXT NOT NULL,
      status_at_time TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS order_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      log_id INTEGER,
      file_path TEXT NOT NULL,
      caption TEXT,
      category TEXT NOT NULL DEFAULT 'PROCESO'
        CHECK(category IN ('RECEPCION', 'DIAGNOSTICO', 'REPARACION', 'PRUEBAS', 'PROCESO')),
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (log_id) REFERENCES order_logs(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_orders_client_user_id ON orders(client_user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
    CREATE INDEX IF NOT EXISTS idx_order_logs_order_id ON order_logs(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_photos_order_id ON order_photos(order_id);
  `);

  // Safe migration if an existing database was created before expires_at existed
  const cols = db
    .prepare(`PRAGMA table_info(orders)`)
    .all() as unknown as { name: string }[];
  const hasExpiresAt = cols.some((c) => c.name === 'expires_at');
  if (!hasExpiresAt) {
    db.exec(`ALTER TABLE orders ADD COLUMN expires_at TEXT`);
    const rows = db
      .prepare(`SELECT id, received_at FROM orders WHERE expires_at IS NULL`)
      .all() as unknown as { id: number; received_at: string }[];
    const updateStmt = db.prepare(`UPDATE orders SET expires_at = ? WHERE id = ?`);
    for (const row of rows) {
      updateStmt.run(calculateExpiresAt(row.received_at), row.id);
    }
  }
  db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_expires_at ON orders(expires_at);`);
}

export function getDb(): DatabaseSync {
  if (!globalThis.__techcareDb) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const db = new DatabaseSync(DB_PATH);
    initSchema(db);
    globalThis.__techcareDb = db;
  }
  return globalThis.__techcareDb;
}

export function runInTransaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // ignore rollback errors
    }
    throw error;
  }
}

function toPlain<T>(row: T): T {
  return { ...row };
}

export function getOrderWithDetails(orderId: number): OrderWithDetails | null {
  const db = getDb();
  const rawOrder = db
    .prepare(
      `SELECT o.*, u.username AS client_username
       FROM orders o
       JOIN users u ON u.id = o.client_user_id
       WHERE o.id = ?`
    )
    .get(orderId) as (DbOrder & { client_username: string }) | undefined;

  if (!rawOrder) return null;

  const order = toPlain(rawOrder);

  const logs = (
    db
      .prepare(
        `SELECT * FROM order_logs WHERE order_id = ? ORDER BY created_at DESC, id DESC`
      )
      .all(orderId) as unknown as DbOrderLog[]
  ).map(toPlain);

  const photos = (
    db
      .prepare(
        `SELECT * FROM order_photos WHERE order_id = ? ORDER BY created_at DESC, id DESC`
      )
      .all(orderId) as unknown as DbOrderPhoto[]
  ).map(toPlain);

  const photosByLog = new Map<number, DbOrderPhoto[]>();
  for (const photo of photos) {
    if (photo.log_id !== null) {
      const arr = photosByLog.get(photo.log_id) || [];
      arr.push(photo);
      photosByLog.set(photo.log_id, arr);
    }
  }

  return {
    ...order,
    logs: logs.map((log) => ({
      ...log,
      photos: photosByLog.get(log.id) || [],
    })),
    photos,
  };
}

export function generateNextOrderNumber(): string {
  const db = getDb();
  const year = new Date().getFullYear();
  const row = db
    .prepare(`SELECT COUNT(*) as count FROM orders`)
    .get() as { count: number };
  let seq = Number(row.count) + 1;
  while (true) {
    const candidate = `ORD-${year}-${String(seq).padStart(4, '0')}`;
    const exists = db
      .prepare(`SELECT 1 FROM orders WHERE order_number = ?`)
      .get(candidate);
    if (!exists) return candidate;
    seq++;
  }
}

export function deleteOrderAndAssets(orderId: number): boolean {
  const db = getDb();
  const order = db
    .prepare(
      `SELECT id, client_user_id, initial_photo_path, consent_signature_path
       FROM orders
       WHERE id = ?`
    )
    .get(orderId) as
    | {
        id: number;
        client_user_id: number;
        initial_photo_path: string | null;
        consent_signature_path: string | null;
      }
    | undefined;

  if (!order) return false;

  const photos = db
    .prepare(`SELECT file_path FROM order_photos WHERE order_id = ?`)
    .all(orderId) as unknown as { file_path: string }[];

  runInTransaction(db, () => {
    db.prepare(`DELETE FROM orders WHERE id = ?`).run(orderId);

    const remainingOrders = db
      .prepare(`SELECT COUNT(*) as c FROM orders WHERE client_user_id = ?`)
      .get(order.client_user_id) as { c: number };

    if (Number(remainingOrders.c) === 0) {
      db.prepare(`DELETE FROM users WHERE id = ? AND role = 'CLIENT'`).run(
        order.client_user_id
      );
    }
  });

  deleteUploadedFile(order.initial_photo_path);
  deleteUploadedFile(order.consent_signature_path);
  for (const p of photos) {
    deleteUploadedFile(p.file_path);
  }

  return true;
}

/**
 * Conserva los registros únicamente durante 2 meses a partir de cada ingreso manual.
 * Solo actúa cuando existen órdenes registradas y elimina automáticamente cualquier
 * orden cuyo plazo de 2 meses haya vencido (junto con sus logs, fotos, firma y cliente).
 */
export function purgeExpiredOrders(): number {
  const db = getDb();
  const nowIso = new Date().toISOString();

  const expired = db
    .prepare(
      `SELECT id
       FROM orders
       WHERE expires_at IS NOT NULL AND expires_at <= ?`
    )
    .all(nowIso) as unknown as { id: number }[];

  if (expired.length === 0) {
    return 0;
  }

  let purged = 0;
  for (const row of expired) {
    if (deleteOrderAndAssets(Number(row.id))) {
      purged++;
    }
  }
  return purged;
}

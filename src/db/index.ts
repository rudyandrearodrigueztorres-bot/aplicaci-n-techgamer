import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import type { ConsentMethod, OrderStatus, PhotoCategory } from '@/lib/constants';
import type { UserRole } from '@/lib/auth';

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
  var __techcareDb: Database.Database | undefined;
}

function initSchema(db: Database.Database) {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
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
}

export function getDb(): Database.Database {
  if (!globalThis.__techcareDb) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const db = new Database(DB_PATH);
    initSchema(db);
    globalThis.__techcareDb = db;
  }
  return globalThis.__techcareDb;
}

export function getOrderWithDetails(orderId: number): OrderWithDetails | null {
  const db = getDb();
  const order = db
    .prepare(
      `SELECT o.*, u.username AS client_username
       FROM orders o
       JOIN users u ON u.id = o.client_user_id
       WHERE o.id = ?`
    )
    .get(orderId) as (DbOrder & { client_username: string }) | undefined;

  if (!order) return null;

  const logs = db
    .prepare(
      `SELECT * FROM order_logs WHERE order_id = ? ORDER BY created_at DESC, id DESC`
    )
    .all(orderId) as DbOrderLog[];

  const photos = db
    .prepare(
      `SELECT * FROM order_photos WHERE order_id = ? ORDER BY created_at DESC, id DESC`
    )
    .all(orderId) as DbOrderPhoto[];

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
  let seq = row.count + 1;
  while (true) {
    const candidate = `ORD-${year}-${String(seq).padStart(4, '0')}`;
    const exists = db
      .prepare(`SELECT 1 FROM orders WHERE order_number = ?`)
      .get(candidate);
    if (!exists) return candidate;
    seq++;
  }
}


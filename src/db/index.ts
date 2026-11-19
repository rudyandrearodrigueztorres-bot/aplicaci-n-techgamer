import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import {
  calculateExpiresAt,
  type ConsentMethod,
  type OrderStatus,
  type PhotoCategory,
} from '@/lib/constants';
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
  client_user_id: number | null;
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
  client_username: string | null;
  logs: (DbOrderLog & { photos: DbOrderPhoto[] })[];
  photos: DbOrderPhoto[];
}

const PG_URL =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.NEON_DATABASE_URL ||
  '';

export function isPostgres(): boolean {
  return Boolean(PG_URL);
}

const IS_VERCEL = Boolean(process.env.VERCEL);
const DATA_DIR = IS_VERCEL
  ? path.join('/tmp', 'techcare-data')
  : path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'taller.db');

declare global {
  // eslint-disable-next-line no-var
  var __techcareSqlite: DatabaseSync | undefined;
  // eslint-disable-next-line no-var
  var __techcarePgPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __techcareSchemaReady: Promise<void> | undefined;
}

function getSqlite(): DatabaseSync {
  if (!globalThis.__techcareSqlite) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const db = new DatabaseSync(DB_PATH);
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
    `);
    globalThis.__techcareSqlite = db;
  }
  return globalThis.__techcareSqlite;
}

function getPgPool(): Pool {
  if (!globalThis.__techcarePgPool) {
    globalThis.__techcarePgPool = new Pool({
      connectionString: PG_URL,
      ssl: PG_URL.includes('localhost')
        ? undefined
        : { rejectUnauthorized: false },
      max: 5,
    });
  }
  return globalThis.__techcarePgPool;
}

function toPgSql(sql: string): string {
  let idx = 0;
  return sql.replace(/\?/g, () => `$${++idx}`);
}

function toPlain<T>(row: T): T {
  return { ...row };
}

function toSqliteParams(params: unknown[]): SQLInputValue[] {
  return params.map((p) => {
    if (p === undefined || p === null) return null;
    if (typeof p === 'boolean') return p ? 1 : 0;
    return p as SQLInputValue;
  });
}

async function initSchemaInternal(): Promise<void> {
  if (isPostgres()) {
    const pool = getPgPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('TECHNICIAN', 'CLIENT')),
        full_name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_number TEXT UNIQUE NOT NULL,
        client_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
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
        consent_version TEXT NOT NULL DEFAULT 'v2.1-RGPD-2026',
        final_diagnosis TEXT,
        solution_applied TEXT,
        warranty_granted TEXT,
        technician_name TEXT,
        certificate_code TEXT UNIQUE NOT NULL,
        expires_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS order_logs (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        author_name TEXT NOT NULL,
        comment TEXT NOT NULL,
        status_at_time TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS order_photos (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        log_id INTEGER REFERENCES order_logs(id) ON DELETE SET NULL,
        file_path TEXT NOT NULL,
        caption TEXT,
        category TEXT NOT NULL DEFAULT 'PROCESO'
          CHECK(category IN ('RECEPCION', 'DIAGNOSTICO', 'REPARACION', 'PRUEBAS', 'PROCESO')),
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS stored_files (
        filename TEXT PRIMARY KEY,
        mime_type TEXT NOT NULL,
        data_base64 TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_orders_client_user_id ON orders(client_user_id);
      CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
      CREATE INDEX IF NOT EXISTS idx_orders_expires_at ON orders(expires_at);
      CREATE INDEX IF NOT EXISTS idx_order_logs_order_id ON order_logs(order_id);
      CREATE INDEX IF NOT EXISTS idx_order_photos_order_id ON order_photos(order_id);
    `);

    // Non-destructive migration for existing Postgres tables so deleting a user preserves orders
    await pool.query(`
      DO $$
      BEGIN
        ALTER TABLE orders ALTER COLUMN client_user_id DROP NOT NULL;
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_name = 'orders' AND constraint_name = 'orders_client_user_id_fkey'
        ) THEN
          ALTER TABLE orders DROP CONSTRAINT orders_client_user_id_fkey;
        END IF;
        ALTER TABLE orders
          ADD CONSTRAINT orders_client_user_id_fkey
          FOREIGN KEY (client_user_id) REFERENCES users(id) ON DELETE SET NULL;
      EXCEPTION WHEN OTHERS THEN
        -- Keep existing data untouched if already migrated
        NULL;
      END $$;
    `);
    return;
  }

  const db = getSqlite();
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
      client_user_id INTEGER,
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
      consent_version TEXT NOT NULL DEFAULT 'v2.1-RGPD-2026',
      final_diagnosis TEXT,
      solution_applied TEXT,
      warranty_granted TEXT,
      technician_name TEXT,
      certificate_code TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (client_user_id) REFERENCES users(id) ON DELETE SET NULL
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

    CREATE TABLE IF NOT EXISTS stored_files (
      filename TEXT PRIMARY KEY,
      mime_type TEXT NOT NULL,
      data_base64 TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_orders_client_user_id ON orders(client_user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
    CREATE INDEX IF NOT EXISTS idx_order_logs_order_id ON order_logs(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_photos_order_id ON order_photos(order_id);
  `);

  const cols = db
    .prepare(`PRAGMA table_info(orders)`)
    .all() as unknown as { name: string; notnull: number }[];
  if (!cols.some((c) => c.name === 'expires_at')) {
    db.exec(`ALTER TABLE orders ADD COLUMN expires_at TEXT`);
    const rows = db
      .prepare(`SELECT id, received_at FROM orders WHERE expires_at IS NULL`)
      .all() as unknown as { id: number; received_at: string }[];
    const updateStmt = db.prepare(`UPDATE orders SET expires_at = ? WHERE id = ?`);
    for (const row of rows) {
      updateStmt.run(calculateExpiresAt(row.received_at), row.id);
    }
  }

  // Non-destructive SQLite migration if client_user_id was previously NOT NULL
  const clientCol = cols.find((c) => c.name === 'client_user_id');
  if (clientCol && clientCol.notnull === 1) {
    db.exec(`
      PRAGMA foreign_keys = OFF;
      BEGIN;
      CREATE TABLE orders_migrated (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE NOT NULL,
        client_user_id INTEGER,
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
        consent_version TEXT NOT NULL DEFAULT 'v2.1-RGPD-2026',
        final_diagnosis TEXT,
        solution_applied TEXT,
        warranty_granted TEXT,
        technician_name TEXT,
        certificate_code TEXT UNIQUE NOT NULL,
        expires_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (client_user_id) REFERENCES users(id) ON DELETE SET NULL
      );
      INSERT INTO orders_migrated SELECT
        id, order_number, client_user_id, client_name, client_phone, client_email, client_temp_password,
        device_brand, device_model, device_serial, reported_issue, status,
        received_at, completed_at, delivered_at, initial_photo_path,
        consent_accepted, consent_accepted_at, consent_method, consent_signature_path, consent_signer_name, consent_version,
        final_diagnosis, solution_applied, warranty_granted, technician_name, certificate_code, expires_at, updated_at
      FROM orders;
      DROP TABLE orders;
      ALTER TABLE orders_migrated RENAME TO orders;
      CREATE INDEX IF NOT EXISTS idx_orders_client_user_id ON orders(client_user_id);
      CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
      COMMIT;
      PRAGMA foreign_keys = ON;
    `);
  }

  db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_expires_at ON orders(expires_at);`);
}

export async function ensureSchema(): Promise<void> {
  if (!globalThis.__techcareSchemaReady) {
    globalThis.__techcareSchemaReady = initSchemaInternal().catch((err) => {
      globalThis.__techcareSchemaReady = undefined;
      throw err;
    });
  }
  await globalThis.__techcareSchemaReady;
}

export async function queryOne<T>(
  sql: string,
  params: unknown[] = []
): Promise<T | undefined> {
  await ensureSchema();
  if (isPostgres()) {
    const res = await getPgPool().query(toPgSql(sql), params);
    return res.rows[0] ? toPlain(res.rows[0] as T) : undefined;
  }
  const row = getSqlite()
    .prepare(sql)
    .get(...toSqliteParams(params)) as T | undefined;
  return row ? toPlain(row) : undefined;
}

export async function queryAll<T>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  await ensureSchema();
  if (isPostgres()) {
    const res = await getPgPool().query(toPgSql(sql), params);
    return res.rows.map((r) => toPlain(r as T));
  }
  const rows = getSqlite()
    .prepare(sql)
    .all(...toSqliteParams(params)) as unknown as T[];
  return rows.map(toPlain);
}

export async function execute(
  sql: string,
  params: unknown[] = []
): Promise<{ changes: number }> {
  await ensureSchema();
  if (isPostgres()) {
    const res = await getPgPool().query(toPgSql(sql), params);
    return { changes: res.rowCount ?? 0 };
  }
  const res = getSqlite()
    .prepare(sql)
    .run(...toSqliteParams(params));
  return { changes: Number(res.changes ?? 0) };
}

export async function insertReturningId(
  sql: string,
  params: unknown[] = []
): Promise<number> {
  await ensureSchema();
  if (isPostgres()) {
    const pgSql = `${toPgSql(sql)} RETURNING id`;
    const res = await getPgPool().query(pgSql, params);
    return Number(res.rows[0].id);
  }
  const res = getSqlite()
    .prepare(sql)
    .run(...toSqliteParams(params));
  return Number(res.lastInsertRowid);
}

// Persistent binary storage helper (PostgreSQL stored_files + local fallback)
export async function saveFileToDb(
  filename: string,
  mimeType: string,
  buffer: Buffer
): Promise<void> {
  await ensureSchema();
  const safeName = path.basename(filename);
  const b64 = buffer.toString('base64');
  const nowIso = new Date().toISOString();
  if (isPostgres()) {
    await getPgPool().query(
      `INSERT INTO stored_files (filename, mime_type, data_base64, created_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (filename) DO UPDATE SET mime_type = EXCLUDED.mime_type, data_base64 = EXCLUDED.data_base64`,
      [safeName, mimeType, b64, nowIso]
    );
  } else {
    getSqlite()
      .prepare(
        `INSERT OR REPLACE INTO stored_files (filename, mime_type, data_base64, created_at)
         VALUES (?, ?, ?, ?)`
      )
      .run(safeName, mimeType, b64, nowIso);
  }
}

export async function readFileFromDb(
  filename: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const safeName = path.basename(filename);
  const row = await queryOne<{ mime_type: string; data_base64: string }>(
    `SELECT mime_type, data_base64 FROM stored_files WHERE filename = ?`,
    [safeName]
  );
  if (!row) return null;
  return {
    buffer: Buffer.from(row.data_base64, 'base64'),
    mimeType: row.mime_type,
  };
}

export async function deleteFileFromDb(filePath: string | null | undefined): Promise<void> {
  if (!filePath || !filePath.startsWith('/uploads/')) return;
  const safeName = path.basename(filePath);
  await execute(`DELETE FROM stored_files WHERE filename = ?`, [safeName]);
}

export async function getOrderWithDetails(
  orderId: number
): Promise<OrderWithDetails | null> {
  const order = await queryOne<DbOrder & { client_username: string | null }>(
    `SELECT o.*, u.username AS client_username
     FROM orders o
     LEFT JOIN users u ON u.id = o.client_user_id
     WHERE o.id = ?`,
    [orderId]
  );

  if (!order) return null;

  const logs = await queryAll<DbOrderLog>(
    `SELECT * FROM order_logs WHERE order_id = ? ORDER BY created_at DESC, id DESC`,
    [orderId]
  );

  const photos = await queryAll<DbOrderPhoto>(
    `SELECT * FROM order_photos WHERE order_id = ? ORDER BY created_at DESC, id DESC`,
    [orderId]
  );

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

export async function generateNextOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const row = await queryOne<{ count: number | string }>(
    `SELECT COUNT(*) as count FROM orders`
  );
  let seq = Number(row?.count ?? 0) + 1;
  while (true) {
    const candidate = `ORD-${year}-${String(seq).padStart(4, '0')}`;
    const exists = await queryOne<{ id: number }>(
      `SELECT id FROM orders WHERE order_number = ?`,
      [candidate]
    );
    if (!exists) return candidate;
    seq++;
  }
}

function unlinkLocalUpload(filePath: string | null | undefined) {
  if (!filePath || !filePath.startsWith('/uploads/')) return;
  const safeName = path.basename(filePath);
  const dirs = [
    IS_VERCEL ? path.join('/tmp', 'techcare-uploads') : path.join(process.cwd(), 'public', 'uploads'),
    path.join(process.cwd(), 'public', 'uploads'),
  ];
  for (const dir of dirs) {
    const full = path.join(dir, safeName);
    try {
      if (fs.existsSync(full)) fs.unlinkSync(full);
    } catch {
      // ignore read-only paths
    }
  }
}

export async function deleteOrderAndAssets(orderId: number): Promise<boolean> {
  const order = await queryOne<{
    id: number;
    client_user_id: number | null;
    initial_photo_path: string | null;
    consent_signature_path: string | null;
  }>(
    `SELECT id, client_user_id, initial_photo_path, consent_signature_path
     FROM orders
     WHERE id = ?`,
    [orderId]
  );

  if (!order) return false;

  const photos = await queryAll<{ file_path: string }>(
    `SELECT file_path FROM order_photos WHERE order_id = ?`,
    [orderId]
  );

  await execute(`DELETE FROM orders WHERE id = ?`, [orderId]);

  if (order.client_user_id !== null) {
    const remainingOrders = await queryOne<{ c: number | string }>(
      `SELECT COUNT(*) as c FROM orders WHERE client_user_id = ?`,
      [order.client_user_id]
    );

    if (Number(remainingOrders?.c ?? 0) === 0) {
      await execute(`DELETE FROM users WHERE id = ? AND role = 'CLIENT'`, [
        order.client_user_id,
      ]);
    }
  }

  await deleteFileFromDb(order.initial_photo_path);
  await deleteFileFromDb(order.consent_signature_path);
  unlinkLocalUpload(order.initial_photo_path);
  unlinkLocalUpload(order.consent_signature_path);

  for (const p of photos) {
    await deleteFileFromDb(p.file_path);
    unlinkLocalUpload(p.file_path);
  }

  return true;
}

/**
 * Elimina un usuario cliente manteniendo intacto el historial de sus órdenes y certificados.
 */
export async function deleteUserAccount(
  userId: number,
  currentAdminId: number
): Promise<{ ok: boolean; error?: string }> {
  if (userId === currentAdminId) {
    return {
      ok: false,
      error: 'No puedes eliminar tu propia cuenta de administrador activa.',
    };
  }

  const user = await queryOne<{ id: number; role: UserRole }>(
    `SELECT id, role FROM users WHERE id = ?`,
    [userId]
  );
  if (!user) {
    return { ok: false, error: 'Usuario no encontrado.' };
  }

  if (user.role === 'TECHNICIAN') {
    const techCount = await queryOne<{ c: number | string }>(
      `SELECT COUNT(*) as c FROM users WHERE role = 'TECHNICIAN'`
    );
    if (Number(techCount?.c ?? 0) <= 1) {
      return {
        ok: false,
        error: 'No se puede eliminar la única cuenta de administrador técnico.',
      };
    }
  }

  // Unlink orders cleanly while preserving all order records, logs, photos, and certificates
  await execute(
    `UPDATE orders SET client_user_id = NULL, client_temp_password = NULL WHERE client_user_id = ?`,
    [userId]
  );
  await execute(`DELETE FROM users WHERE id = ?`, [userId]);

  return { ok: true };
}

/**
 * Conserva los registros durante 2 meses a partir de cada ingreso manual.
 * Elimina automáticamente cualquier orden vencida junto con sus logs, fotos, firma y usuario cliente.
 */
export async function purgeExpiredOrders(): Promise<number> {
  const nowIso = new Date().toISOString();
  const expired = await queryAll<{ id: number }>(
    `SELECT id
     FROM orders
     WHERE expires_at IS NOT NULL AND expires_at <= ?`,
    [nowIso]
  );

  if (expired.length === 0) return 0;

  let purged = 0;
  for (const row of expired) {
    if (await deleteOrderAndAssets(Number(row.id))) {
      purged++;
    }
  }
  return purged;
}

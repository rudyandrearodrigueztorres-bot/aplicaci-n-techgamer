import { getDb } from './index';
import { hashPassword } from '../lib/auth';

export const DEFAULT_TECHNICIAN_NAME =
  process.env.ADMIN_NAME || 'Técnico Miguel Gómez';

export function seedDatabase(force = false) {
  const db = getDb();

  if (force) {
    db.exec(`
      DELETE FROM order_photos;
      DELETE FROM order_logs;
      DELETE FROM orders;
      DELETE FROM users;
    `);
  }

  const existingAdmin = db
    .prepare(`SELECT id, full_name FROM users WHERE role = 'TECHNICIAN' LIMIT 1`)
    .get() as { id: number; full_name: string } | undefined;

  if (existingAdmin) {
    if (
      existingAdmin.full_name === 'Ing. Alejandro Morales' ||
      existingAdmin.full_name === 'Administrador Técnico'
    ) {
      db.prepare(`UPDATE users SET full_name = ? WHERE id = ?`).run(
        DEFAULT_TECHNICIAN_NAME,
        existingAdmin.id
      );
      db.prepare(
        `UPDATE orders SET technician_name = ? WHERE technician_name IN ('Ing. Alejandro Morales', 'Administrador Técnico')`
      ).run(DEFAULT_TECHNICIAN_NAME);
      db.prepare(
        `UPDATE order_logs SET author_name = ? WHERE author_name IN ('Ing. Alejandro Morales', 'Administrador Técnico')`
      ).run(DEFAULT_TECHNICIAN_NAME);
    }
    return;
  }

  const adminUsername = (process.env.ADMIN_USERNAME || 'tecnico').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminEmail = process.env.ADMIN_EMAIL || null;

  db.prepare(
    `INSERT INTO users (username, password_hash, role, full_name, email, phone, created_at)
     VALUES (?, ?, 'TECHNICIAN', ?, ?, NULL, ?)`
  ).run(
    adminUsername,
    hashPassword(adminPassword),
    DEFAULT_TECHNICIAN_NAME,
    adminEmail,
    new Date().toISOString()
  );
}

const isDirectExecution =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  process.argv[1].endsWith('seed.ts');

if (isDirectExecution) {
  const forceFlag = process.argv.includes('--force');
  seedDatabase(forceFlag);
  console.log(
    `Base de datos inicializada sin registros de prueba (administrador: ${DEFAULT_TECHNICIAN_NAME}).`
  );
}

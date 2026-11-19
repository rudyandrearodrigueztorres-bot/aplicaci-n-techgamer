import { getDb } from './index';
import { hashPassword } from '../lib/auth';

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
    .prepare(`SELECT id FROM users WHERE role = 'TECHNICIAN' LIMIT 1`)
    .get();

  if (existingAdmin) {
    return;
  }

  const adminUsername = (process.env.ADMIN_USERNAME || 'tecnico').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminFullName = process.env.ADMIN_NAME || 'Administrador Técnico';
  const adminEmail = process.env.ADMIN_EMAIL || null;

  db.prepare(
    `INSERT INTO users (username, password_hash, role, full_name, email, phone, created_at)
     VALUES (?, ?, 'TECHNICIAN', ?, ?, NULL, ?)`
  ).run(
    adminUsername,
    hashPassword(adminPassword),
    adminFullName,
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
  console.log('Base de datos inicializada sin registros de prueba (solo cuenta de administrador).');
}

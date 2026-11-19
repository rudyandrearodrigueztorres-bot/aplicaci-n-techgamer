import { execute, queryOne } from './index';
import { hashPassword } from '../lib/auth';

export const DEFAULT_TECHNICIAN_NAME =
  process.env.ADMIN_NAME || 'Técnico Miguel Gómez';

export async function seedDatabase(force = false): Promise<void> {
  if (force) {
    await execute(`DELETE FROM order_photos`);
    await execute(`DELETE FROM order_logs`);
    await execute(`DELETE FROM orders`);
    await execute(`DELETE FROM users`);
    await execute(`DELETE FROM stored_files`);
  }

  const existingAdmin = await queryOne<{ id: number; full_name: string }>(
    `SELECT id, full_name FROM users WHERE role = 'TECHNICIAN' LIMIT 1`
  );

  if (existingAdmin) {
    if (
      existingAdmin.full_name === 'Ing. Alejandro Morales' ||
      existingAdmin.full_name === 'Administrador Técnico'
    ) {
      await execute(`UPDATE users SET full_name = ? WHERE id = ?`, [
        DEFAULT_TECHNICIAN_NAME,
        existingAdmin.id,
      ]);
      await execute(
        `UPDATE orders SET technician_name = ? WHERE technician_name IN ('Ing. Alejandro Morales', 'Administrador Técnico')`,
        [DEFAULT_TECHNICIAN_NAME]
      );
      await execute(
        `UPDATE order_logs SET author_name = ? WHERE author_name IN ('Ing. Alejandro Morales', 'Administrador Técnico')`,
        [DEFAULT_TECHNICIAN_NAME]
      );
    }
    return;
  }

  const adminUsername = (process.env.ADMIN_USERNAME || 'tecnico')
    .trim()
    .toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminEmail = process.env.ADMIN_EMAIL || null;

  await execute(
    `INSERT INTO users (username, password_hash, role, full_name, email, phone, created_at)
     VALUES (?, ?, 'TECHNICIAN', ?, ?, NULL, ?)`,
    [
      adminUsername,
      hashPassword(adminPassword),
      DEFAULT_TECHNICIAN_NAME,
      adminEmail,
      new Date().toISOString(),
    ]
  );
}

const isDirectExecution =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  process.argv[1].endsWith('seed.ts');

if (isDirectExecution) {
  const forceFlag = process.argv.includes('--force');
  seedDatabase(forceFlag)
    .then(() => {
      console.log(
        `Base de datos inicializada sin registros de prueba (administrador: ${DEFAULT_TECHNICIAN_NAME}).`
      );
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

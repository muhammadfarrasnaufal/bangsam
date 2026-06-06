import { RowDataPacket } from "mysql2";
import pool from "./db";
import { verifyPassword } from "./password";

type AdminRow = RowDataPacket & {
  id: number;
  nama: string;
  email: string;
  password: string;
  role: "admin" | "petugas" | "nasabah";
};

export async function getAdminByCredentials(username: string, password: string) {
  const normalized = username.trim().toLowerCase();
  const [rows] = await pool.query<AdminRow[]>(
    `
      SELECT id, nama, email, password, role
      FROM users
      WHERE role IN ('admin', 'petugas')
        AND (LOWER(email) = ? OR LOWER(nama) = ?)
      LIMIT 1
    `,
    [normalized, normalized]
  );

  const admin = rows[0];
  if (!admin) {
    return null;
  }

  const valid = await verifyPassword(password, admin.password);
  if (!valid) {
    return null;
  }

  return {
    id: admin.id,
    nama: admin.nama,
    email: admin.email,
    role: admin.role,
  };
}

export async function verifyAdmin(username: string, password: string) {
  const admin = await getAdminByCredentials(username, password);
  return Boolean(admin);
}

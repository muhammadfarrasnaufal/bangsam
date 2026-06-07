import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "./db";
import { verifyPassword } from "./password";

const SESSION_TTL_DAYS = 30;

let mobileStaffAuthReady = false;

async function ensureMobileStaffAuthTables() {
  if (mobileStaffAuthReady) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS mobile_staff_sessions (
      token VARCHAR(128) PRIMARY KEY,
      staff_id INT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_mobile_staff_sessions_user
        FOREIGN KEY (staff_id) REFERENCES users(id)
        ON DELETE CASCADE
    )
  `);

  mobileStaffAuthReady = true;
}

function normalizeIdentifier(identifier: string) {
  return identifier.trim().toLowerCase();
}

type StaffAuthRow = RowDataPacket & {
  id: number;
  nama: string;
  no_hp: string | null;
  email: string;
  password: string;
  role: string;
};

export async function createMobileStaffSession(identifier: string, password: string) {
  await ensureMobileStaffAuthTables();

  const normalized = normalizeIdentifier(identifier);
  const [rows] = await pool.query<StaffAuthRow[]>(
    `
      SELECT id, nama, no_hp, email, password, role
      FROM users
      WHERE role = 'petugas'
        AND (LOWER(email) = ? OR LOWER(COALESCE(no_hp, '')) = ? OR LOWER(nama) = ?)
      LIMIT 1
    `,
    [normalized, normalized, normalized]
  );

  const staff = rows[0];
  if (!staff || !(await verifyPassword(password, staff.password))) {
    return null;
  }

  const token = `mb-staff-${randomUUID()}-${Date.now()}`;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

  await pool.query(
    "INSERT INTO mobile_staff_sessions (token, staff_id, expires_at) VALUES (?, ?, ?)",
    [token, staff.id, expiresAt]
  );

  return {
    token,
    user: {
      id: staff.id,
      nama: staff.nama,
      email: staff.email,
      noHp: staff.no_hp,
      role: staff.role,
    },
  };
}

export async function requireMobileStaffSession(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return null;
  }

  await ensureMobileStaffAuthTables();

  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT staff_id
      FROM mobile_staff_sessions
      WHERE token = ? AND expires_at > NOW()
      LIMIT 1
    `,
    [token]
  );

  return rows[0]?.staff_id ? String(rows[0].staff_id) : null;
}

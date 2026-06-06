import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "./db";
import { verifyPassword } from "./password";

const SESSION_TTL_DAYS = 30;

let mobileAuthReady = false;

async function ensureMobileAuthTables() {
  if (mobileAuthReady) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS mobile_sessions (
      token VARCHAR(128) PRIMARY KEY,
      member_id INT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_mobile_sessions_member
        FOREIGN KEY (member_id) REFERENCES users(id)
        ON DELETE CASCADE
    )
  `);

  mobileAuthReady = true;
}

function normalizeIdentifier(identifier: string) {
  return identifier.trim().toLowerCase();
}

type MemberAuthRow = RowDataPacket & {
  id: number;
  nama: string;
  no_hp: string;
  email: string;
  password: string;
};

export async function createMobileSession(identifier: string, password: string) {
  await ensureMobileAuthTables();

  const normalized = normalizeIdentifier(identifier);
  const [rows] = await pool.query<MemberAuthRow[]>(
    `
      SELECT id, nama, no_hp, email, password
      FROM users
      WHERE role = 'nasabah'
        AND (LOWER(email) = ? OR LOWER(no_hp) = ? OR LOWER(nama) = ?)
      LIMIT 1
    `,
    [normalized, normalized, normalized]
  );

  const member = rows[0];
  if (!member || !(await verifyPassword(password, member.password))) {
    return null;
  }

  const token = `mb-${randomUUID()}-${Date.now()}`;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

  await pool.query(
    "INSERT INTO mobile_sessions (token, member_id, expires_at) VALUES (?, ?, ?)",
    [token, member.id, expiresAt]
  );

  return {
    token,
    memberId: String(member.id),
  };
}

export async function requireMobileSession(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return null;
  }

  await ensureMobileAuthTables();

  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT member_id
      FROM mobile_sessions
      WHERE token = ? AND expires_at > NOW()
      LIMIT 1
    `,
    [token]
  );

  return rows[0]?.member_id ? String(rows[0].member_id) : null;
}

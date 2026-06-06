import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "./db";

const SESSION_COOKIE = "admin_session";
const SESSION_TTL_DAYS = 7;

type SessionUserRow = RowDataPacket & {
  id: number;
  nama: string;
  email: string;
  role: "admin" | "petugas";
};

let sessionTableReady = false;

async function ensureSessionTable() {
  if (sessionTableReady) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS web_admin_sessions (
      token VARCHAR(128) PRIMARY KEY,
      user_id INT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_web_admin_sessions_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
    )
  `);

  sessionTableReady = true;
}

export async function createAdminSession(userId: number) {
  await ensureSessionTable();

  const token = `web-${randomUUID()}-${Date.now()}`;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

  await pool.query(
    "INSERT INTO web_admin_sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
    [token, userId, expiresAt]
  );

  return {
    token,
    expiresAt,
  };
}

export async function deleteAdminSession(token: string) {
  await ensureSessionTable();
  await pool.query("DELETE FROM web_admin_sessions WHERE token = ?", [token]);
}

export async function getAdminSessionUserByToken(token: string) {
  if (!token) {
    return null;
  }

  await ensureSessionTable();

  const [rows] = await pool.query<SessionUserRow[]>(
    `
      SELECT u.id, u.nama, u.email, u.role
      FROM web_admin_sessions s
      INNER JOIN users u ON u.id = s.user_id
      WHERE s.token = ?
        AND s.expires_at > NOW()
        AND u.role IN ('admin', 'petugas')
      LIMIT 1
    `,
    [token]
  );

  return rows[0] ?? null;
}

export async function getAdminSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  return getAdminSessionUserByToken(token);
}

export function setAdminSessionCookie(token: string, expiresAt: Date) {
  const store = cookies() as unknown as {
    set: (input: {
      name: string;
      value: string;
      httpOnly?: boolean;
      sameSite?: "strict" | "lax" | "none";
      secure?: boolean;
      expires?: Date;
      maxAge?: number;
      path?: string;
    }) => void;
  };

  store.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export function clearAdminSessionCookie() {
  const store = cookies() as unknown as {
    set: (input: {
      name: string;
      value: string;
      maxAge?: number;
      path?: string;
    }) => void;
  };

  store.set({
    name: SESSION_COOKIE,
    value: "",
    maxAge: 0,
    path: "/",
  });
}

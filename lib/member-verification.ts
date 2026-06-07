import { randomInt } from "crypto";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import pool from "./db";
import { hashPassword } from "./password";

type VerificationRow = RowDataPacket & {
  id: number;
  nama: string;
  email: string;
  role: string;
  no_hp: string | null;
  alamat: string | null;
  verification_status: string | null;
  verification_code: string | null;
  verified_at: Date | string | null;
  verified_by: number | null;
  created_at: Date | string;
};

let memberVerificationReady = false;

function toIsoString(value: Date | string | null | undefined) {
  return value ? new Date(value).toISOString() : null;
}

function createQrPayload(code: string) {
  return `bangsam://verify-member?code=${encodeURIComponent(code)}`;
}

function parseVerificationInput(input: { code?: string; qrPayload?: string }) {
  const rawCode = input.code?.trim();
  if (rawCode) {
    return rawCode.toUpperCase();
  }

  const qrPayload = input.qrPayload?.trim();
  if (!qrPayload) {
    return "";
  }

  try {
    const url = new URL(qrPayload);
    const parsed = url.searchParams.get("code") ?? "";
    return parsed.trim().toUpperCase();
  } catch {
    const match = qrPayload.match(/code=([A-Za-z0-9-]+)/i);
    return (match?.[1] ?? "").trim().toUpperCase();
  }
}

export async function ensureMemberVerificationSchema() {
  if (memberVerificationReady) {
    return;
  }

  await pool.query(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_status VARCHAR(32) NOT NULL DEFAULT 'verified'"
  );
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code VARCHAR(32) NULL");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_at DATETIME NULL");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_by INT NULL");

  await pool.query(
    "UPDATE users SET verification_status = 'verified' WHERE role IN ('admin', 'petugas') AND (verification_status IS NULL OR verification_status = '')"
  );
  await pool.query(
    "UPDATE users SET verification_status = 'verified', verified_at = COALESCE(verified_at, created_at) WHERE role = 'nasabah' AND verification_status IS NULL"
  );

  memberVerificationReady = true;
}

async function generateUniqueVerificationCode() {
  await ensureMemberVerificationSchema();

  for (let index = 0; index < 10; index += 1) {
    const code = `BSM${randomInt(100000, 999999)}`;
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE verification_code = ? LIMIT 1",
      [code]
    );
    if (!rows[0]) {
      return code;
    }
  }

  throw new Error("Gagal membuat kode verifikasi unik");
}

function mapVerificationRow(row: VerificationRow | undefined | null) {
  if (!row) {
    return null;
  }

  const status = row.verification_status || "pending";
  const code = row.verification_code ?? "";

  return {
    member: {
      id: row.id,
      nama: row.nama,
      email: row.email,
      role: row.role,
      noHp: row.no_hp,
      alamat: row.alamat,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    },
    verification: {
      status,
      code,
      qrPayload: code ? createQrPayload(code) : null,
      verifiedAt: toIsoString(row.verified_at),
      verifiedBy: row.verified_by == null ? null : Number(row.verified_by),
    },
  };
}

export async function getMemberVerificationStatus(memberId: number) {
  await ensureMemberVerificationSchema();

  const [rows] = await pool.query<VerificationRow[]>(
    `
      SELECT id, nama, email, role, no_hp, alamat, verification_status, verification_code, verified_at, verified_by, created_at
      FROM users
      WHERE id = ? AND role = 'nasabah'
      LIMIT 1
    `,
    [memberId]
  );

  return mapVerificationRow(rows[0]);
}

export async function registerMobileMember(input: {
  nama: string;
  email: string;
  password: string;
  noHp: string;
  alamat?: string;
}) {
  await ensureMemberVerificationSchema();

  const code = await generateUniqueVerificationCode();
  const hashedPassword = await hashPassword(input.password.trim());

  const [result] = await pool.query<ResultSetHeader>(
    `
      INSERT INTO users (nama, email, password, role, alamat, no_hp, verification_status, verification_code, verified_at, verified_by)
      VALUES (?, ?, ?, 'nasabah', ?, ?, 'pending', ?, NULL, NULL)
    `,
    [
      input.nama.trim(),
      input.email.trim().toLowerCase(),
      hashedPassword,
      input.alamat?.trim() || null,
      input.noHp.trim(),
      code,
    ]
  );

  await pool.query("INSERT INTO saldo (user_id, total_saldo) VALUES (?, 0)", [result.insertId]);

  return getMemberVerificationStatus(result.insertId);
}

export async function assertMemberVerified(memberId: number) {
  const member = await getMemberVerificationStatus(memberId);
  if (!member) {
    throw new Error("Member tidak ditemukan");
  }

  if (member.verification.status !== "verified") {
    throw new Error("Akun Anda belum diverifikasi petugas");
  }

  return member;
}

export async function listVerifiableMembers(filters?: {
  q?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  await ensureMemberVerificationSchema();

  const page = Math.max(1, Number(filters?.page ?? 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters?.limit ?? 10) || 10));
  const offset = (page - 1) * limit;
  const conditions = ["role = 'nasabah'"];
  const params: Array<string | number> = [];

  if (filters?.status?.trim()) {
    conditions.push("verification_status = ?");
    params.push(filters.status.trim());
  }

  if (filters?.q?.trim()) {
    const keyword = `%${filters.q.trim()}%`;
    conditions.push("(nama LIKE ? OR email LIKE ? OR no_hp LIKE ? OR verification_code LIKE ?)");
    params.push(keyword, keyword, keyword, keyword);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS count FROM users ${whereClause}`,
    params
  );
  const [rows] = await pool.query<VerificationRow[]>(
    `
      SELECT id, nama, email, role, no_hp, alamat, verification_status, verification_code, verified_at, verified_by, created_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `,
    [...params, limit, offset]
  );

  return {
    items: rows.map((row) => mapVerificationRow(row)),
    meta: {
      page,
      limit,
      totalItems: Number(countRows[0]?.count ?? 0),
      totalPages: Math.max(1, Math.ceil(Number(countRows[0]?.count ?? 0) / limit)),
    },
  };
}

export async function verifyMemberByCode(input: {
  staffId: number;
  code?: string;
  qrPayload?: string;
}) {
  await ensureMemberVerificationSchema();
  const code = parseVerificationInput(input);
  if (!code) {
    throw new Error("Kode verifikasi tidak valid");
  }

  const [rows] = await pool.query<VerificationRow[]>(
    `
      SELECT id, nama, email, role, no_hp, alamat, verification_status, verification_code, verified_at, verified_by, created_at
      FROM users
      WHERE role = 'nasabah' AND verification_code = ?
      LIMIT 1
    `,
    [code]
  );

  const member = rows[0];
  if (!member) {
    throw new Error("Kode verifikasi tidak ditemukan");
  }

  if (member.verification_status !== "verified") {
    await pool.query(
      `
        UPDATE users
        SET verification_status = 'verified', verified_at = NOW(), verified_by = ?
        WHERE id = ?
      `,
      [input.staffId, member.id]
    );
  }

  return getMemberVerificationStatus(member.id);
}

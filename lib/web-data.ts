import { ResultSetHeader, RowDataPacket } from "mysql2";
import pool from "./db";
import { hashPassword } from "./password";

export type ApiUser = {
  id: number;
  nama: string;
  email: string;
  role: string;
  alamat: string | null;
  noHp: string | null;
  saldo: number;
  totalSetoranKg: number;
  totalSetoranRp: number;
  createdAt: string;
};

export type ApiWasteType = {
  id: number;
  namaSampah: string;
  hargaPerkg: number;
  barcode: string | null;
  createdAt: string;
};

export type ApiDeposit = {
  id: number;
  nasabahId: number | null;
  nasabahNama: string;
  jenisSampahId: number | null;
  jenisSampahNama: string;
  berat: number;
  total: number;
  status: string;
  petugasId: number | null;
  petugasNama: string | null;
  createdAt: string;
};

export type ApiWithdrawal = {
  id: number;
  nasabahId: number | null;
  nasabahNama: string;
  jumlah: number;
  status: string;
  createdAt: string;
};

export type ApiTransaction = {
  id: number;
  nasabahId: number | null;
  nasabahNama: string;
  tipe: string;
  jumlah: number;
  keterangan: string | null;
  status: string;
  createdAt: string;
  berat: number | null;
};

export type PaginatedResult<T> = {
  items: T[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
};

type DepositRow = RowDataPacket & {
  id: number;
  user_id: number | null;
  customer: string | null;
  jenis_sampah_id: number | null;
  waste_name: string | null;
  berat: number;
  total: number;
  status: string;
  petugas_id: number | null;
  petugas_nama: string | null;
  transaksi_id?: number | null;
  balance_applied?: number | null;
  created_at: Date | string;
};

type WithdrawalRow = RowDataPacket & {
  id: number;
  user_id: number | null;
  customer: string | null;
  jumlah: number;
  status: string;
  transaksi_id?: number | null;
  balance_applied?: number | null;
  created_at: Date | string;
};

type TransactionRow = RowDataPacket & {
  id: number;
  user_id: number | null;
  customer: string | null;
  tipe: string;
  jumlah: number;
  keterangan: string | null;
  status: string;
  created_at: Date | string;
  berat: number | null;
};

type UserRow = RowDataPacket & {
  id: number;
  nama: string;
  email: string;
  role: string;
  alamat: string | null;
  no_hp: string | null;
  saldo: number | null;
  total_setoran_kg: number | null;
  total_setoran_rp: number | null;
  created_at: Date | string;
};

type WasteTypeRow = RowDataPacket & {
  id: number;
  nama_sampah: string;
  harga_perkg: number;
  barcode: string | null;
  created_at: Date | string;
};

function toIsoString(value: Date | string | null | undefined) {
  return value ? new Date(value).toISOString() : new Date().toISOString();
}

function mapDeposit(row: DepositRow): ApiDeposit {
  return {
    id: row.id,
    nasabahId: row.user_id,
    nasabahNama: row.customer ?? "Tanpa Nama",
    jenisSampahId: row.jenis_sampah_id,
    jenisSampahNama: row.waste_name ?? "-",
    berat: Number(row.berat ?? 0),
    total: Number(row.total ?? 0),
    status: row.status,
    petugasId: row.petugas_id,
    petugasNama: row.petugas_nama ?? null,
    createdAt: toIsoString(row.created_at),
  };
}

function mapWithdrawal(row: WithdrawalRow): ApiWithdrawal {
  return {
    id: row.id,
    nasabahId: row.user_id,
    nasabahNama: row.customer ?? "Tanpa Nama",
    jumlah: Number(row.jumlah ?? 0),
    status: row.status,
    createdAt: toIsoString(row.created_at),
  };
}

function mapTransaction(row: TransactionRow): ApiTransaction {
  return {
    id: row.id,
    nasabahId: row.user_id,
    nasabahNama: row.customer ?? "Tanpa Nama",
    tipe: row.tipe,
    jumlah: Number(row.jumlah ?? 0),
    keterangan: row.keterangan ?? null,
    status: row.status,
    createdAt: toIsoString(row.created_at),
    berat: row.berat == null ? null : Number(row.berat),
  };
}

function mapUser(row: UserRow): ApiUser {
  return {
    id: row.id,
    nama: row.nama,
    email: row.email,
    role: row.role,
    alamat: row.alamat,
    noHp: row.no_hp,
    saldo: Number(row.saldo ?? 0),
    totalSetoranKg: Number(row.total_setoran_kg ?? 0),
    totalSetoranRp: Number(row.total_setoran_rp ?? 0),
    createdAt: toIsoString(row.created_at),
  };
}

function mapWasteType(row: WasteTypeRow): ApiWasteType {
  return {
    id: row.id,
    namaSampah: row.nama_sampah,
    hargaPerkg: Number(row.harga_perkg ?? 0),
    barcode: row.barcode ?? null,
    createdAt: toIsoString(row.created_at),
  };
}

function normalizePagination(input?: { page?: number; limit?: number }) {
  const page = Math.max(1, Number(input?.page ?? 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(input?.limit ?? 10) || 10));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

function buildPaginatedResult<T>(items: T[], page: number, limit: number, totalItems: number): PaginatedResult<T> {
  return {
    items,
    meta: {
      page,
      limit,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / limit)),
    },
  };
}

let webDataReady = false;

async function ensureWebDataSchema() {
  if (webDataReady) {
    return;
  }

  await pool.query("ALTER TABLE setoran ADD COLUMN IF NOT EXISTS transaksi_id INT NULL");
  await pool.query("ALTER TABLE setoran ADD COLUMN IF NOT EXISTS balance_applied TINYINT(1) NOT NULL DEFAULT 0");
  await pool.query("ALTER TABLE penarikan ADD COLUMN IF NOT EXISTS transaksi_id INT NULL");
  await pool.query("ALTER TABLE penarikan ADD COLUMN IF NOT EXISTS balance_applied TINYINT(1) NOT NULL DEFAULT 0");

  webDataReady = true;
}

export async function listMembers(filters?: { q?: string; page?: number; limit?: number }) {
  await ensureWebDataSchema();
  const { page, limit, offset } = normalizePagination(filters);
  const conditions = ["u.role = 'nasabah'"];
  const params: Array<string | number> = [];

  if (filters?.q?.trim()) {
    const keyword = `%${filters.q.trim()}%`;
    conditions.push("(u.nama LIKE ? OR u.email LIKE ? OR u.no_hp LIKE ?)");
    params.push(keyword, keyword, keyword);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS count FROM users u ${whereClause}`,
    params
  );
  const [rows] = await pool.query<UserRow[]>(
    `
      SELECT
        u.id,
        u.nama,
        u.email,
        u.role,
        u.alamat,
        u.no_hp,
        u.created_at,
        COALESCE(s.total_saldo, 0) AS saldo,
        COALESCE(SUM(CASE WHEN t.tipe = 'setor' AND t.status = 'berhasil' THEN t.berat ELSE 0 END), 0) AS total_setoran_kg,
        COALESCE(SUM(CASE WHEN t.tipe = 'setor' AND t.status = 'berhasil' THEN t.jumlah ELSE 0 END), 0) AS total_setoran_rp
      FROM users u
      LEFT JOIN saldo s ON s.user_id = u.id
      LEFT JOIN transaksi t ON t.user_id = u.id
      ${whereClause}
      GROUP BY u.id, u.nama, u.email, u.role, u.alamat, u.no_hp, u.created_at, s.total_saldo
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `
    ,
    [...params, limit, offset]
  );

  return buildPaginatedResult(rows.map(mapUser), page, limit, Number(countRows[0]?.count ?? 0));
}

export async function getMemberById(memberId: number) {
  const [rows] = await pool.query<UserRow[]>(
    `
      SELECT
        u.id,
        u.nama,
        u.email,
        u.role,
        u.alamat,
        u.no_hp,
        u.created_at,
        COALESCE(s.total_saldo, 0) AS saldo,
        COALESCE(SUM(CASE WHEN t.tipe = 'setor' AND t.status = 'berhasil' THEN t.berat ELSE 0 END), 0) AS total_setoran_kg,
        COALESCE(SUM(CASE WHEN t.tipe = 'setor' AND t.status = 'berhasil' THEN t.jumlah ELSE 0 END), 0) AS total_setoran_rp
      FROM users u
      LEFT JOIN saldo s ON s.user_id = u.id
      LEFT JOIN transaksi t ON t.user_id = u.id
      WHERE u.id = ? AND u.role = 'nasabah'
      GROUP BY u.id, u.nama, u.email, u.role, u.alamat, u.no_hp, u.created_at, s.total_saldo
      LIMIT 1
    `,
    [memberId]
  );
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function createMember(input: {
  nama: string;
  email: string;
  password: string;
  alamat?: string;
  noHp?: string;
}) {
  await ensureWebDataSchema();
  const hashedPassword = await hashPassword(input.password.trim());
  const [result] = await pool.query<ResultSetHeader>(
    `
      INSERT INTO users (nama, email, password, role, alamat, no_hp)
      VALUES (?, ?, ?, 'nasabah', ?, ?)
    `,
    [input.nama.trim(), input.email.trim().toLowerCase(), hashedPassword, input.alamat?.trim() || null, input.noHp?.trim() || null]
  );

  await pool.query(
    "INSERT INTO saldo (user_id, total_saldo) VALUES (?, 0)",
    [result.insertId]
  );

  return getMemberById(result.insertId);
}

export async function updateMember(
  memberId: number,
  input: { nama?: string; email?: string; password?: string; alamat?: string; noHp?: string }
) {
  await ensureWebDataSchema();
  const current = await getMemberById(memberId);
  if (!current) {
    throw new Error("Anggota tidak ditemukan");
  }

  const hashedPassword = input.password?.trim() ? await hashPassword(input.password.trim()) : null;

  await pool.query(
    `
      UPDATE users
      SET nama = ?, email = ?, password = COALESCE(?, password), alamat = ?, no_hp = ?
      WHERE id = ? AND role = 'nasabah'
    `,
    [
      input.nama?.trim() || current.nama,
      input.email?.trim().toLowerCase() || current.email,
      hashedPassword,
      input.alamat?.trim() ?? current.alamat,
      input.noHp?.trim() ?? current.noHp,
      memberId,
    ]
  );

  return getMemberById(memberId);
}

export async function deleteMember(memberId: number) {
  await ensureWebDataSchema();
  const member = await getMemberById(memberId);
  if (!member) {
    throw new Error("Anggota tidak ditemukan");
  }

  await pool.query("DELETE FROM users WHERE id = ? AND role = 'nasabah'", [memberId]);
  return { success: true };
}

export async function listStaff(filters?: { q?: string; page?: number; limit?: number }) {
  await ensureWebDataSchema();
  const { page, limit, offset } = normalizePagination(filters);
  const conditions = ["u.role = 'petugas'"];
  const params: Array<string | number> = [];

  if (filters?.q?.trim()) {
    const keyword = `%${filters.q.trim()}%`;
    conditions.push("(u.nama LIKE ? OR u.email LIKE ? OR u.no_hp LIKE ?)");
    params.push(keyword, keyword, keyword);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS count FROM users u ${whereClause}`,
    params
  );
  const [rows] = await pool.query<UserRow[]>(
    `
      SELECT
        u.id,
        u.nama,
        u.email,
        u.role,
        u.alamat,
        u.no_hp,
        u.created_at,
        0 AS saldo,
        0 AS total_setoran_kg,
        0 AS total_setoran_rp
      FROM users u
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `,
    [...params, limit, offset]
  );

  return buildPaginatedResult(rows.map(mapUser), page, limit, Number(countRows[0]?.count ?? 0));
}

export async function getStaffById(staffId: number) {
  const [rows] = await pool.query<UserRow[]>(
    `
      SELECT
        u.id,
        u.nama,
        u.email,
        u.role,
        u.alamat,
        u.no_hp,
        u.created_at,
        0 AS saldo,
        0 AS total_setoran_kg,
        0 AS total_setoran_rp
      FROM users u
      WHERE u.id = ? AND u.role = 'petugas'
      LIMIT 1
    `,
    [staffId]
  );

  return rows[0] ? mapUser(rows[0]) : null;
}

export async function createStaff(input: {
  nama: string;
  email: string;
  password: string;
  alamat?: string;
  noHp?: string;
}) {
  await ensureWebDataSchema();
  const hashedPassword = await hashPassword(input.password.trim());
  const [result] = await pool.query<ResultSetHeader>(
    `
      INSERT INTO users (nama, email, password, role, alamat, no_hp)
      VALUES (?, ?, ?, 'petugas', ?, ?)
    `,
    [input.nama.trim(), input.email.trim().toLowerCase(), hashedPassword, input.alamat?.trim() || null, input.noHp?.trim() || null]
  );

  return getStaffById(result.insertId);
}

export async function updateStaff(
  staffId: number,
  input: { nama?: string; email?: string; password?: string; alamat?: string; noHp?: string }
) {
  await ensureWebDataSchema();
  const current = await getStaffById(staffId);
  if (!current) {
    throw new Error("Petugas tidak ditemukan");
  }

  const hashedPassword = input.password?.trim() ? await hashPassword(input.password.trim()) : null;

  await pool.query(
    `
      UPDATE users
      SET nama = ?, email = ?, password = COALESCE(?, password), alamat = ?, no_hp = ?
      WHERE id = ? AND role = 'petugas'
    `,
    [
      input.nama?.trim() || current.nama,
      input.email?.trim().toLowerCase() || current.email,
      hashedPassword,
      input.alamat?.trim() ?? current.alamat,
      input.noHp?.trim() ?? current.noHp,
      staffId,
    ]
  );

  return getStaffById(staffId);
}

export async function deleteStaff(staffId: number) {
  await ensureWebDataSchema();
  const staff = await getStaffById(staffId);
  if (!staff) {
    throw new Error("Petugas tidak ditemukan");
  }

  await pool.query("DELETE FROM users WHERE id = ? AND role = 'petugas'", [staffId]);
  return { success: true };
}

export async function listWasteTypes(filters?: { q?: string; page?: number; limit?: number }) {
  await ensureWebDataSchema();
  const { page, limit, offset } = normalizePagination(filters);
  const params: Array<string | number> = [];
  let whereClause = "";
  if (filters?.q?.trim()) {
    const keyword = `%${filters.q.trim()}%`;
    whereClause = "WHERE nama_sampah LIKE ? OR barcode LIKE ?";
    params.push(keyword, keyword);
  }

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS count FROM jenis_sampah ${whereClause}`,
    params
  );
  const [rows] = await pool.query<WasteTypeRow[]>(
    `SELECT id, nama_sampah, harga_perkg, barcode, created_at FROM jenis_sampah ${whereClause} ORDER BY nama_sampah ASC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return buildPaginatedResult(rows.map(mapWasteType), page, limit, Number(countRows[0]?.count ?? 0));
}

export async function getWasteTypeById(wasteTypeId: number) {
  const [rows] = await pool.query<WasteTypeRow[]>(
    "SELECT id, nama_sampah, harga_perkg, barcode, created_at FROM jenis_sampah WHERE id = ? LIMIT 1",
    [wasteTypeId]
  );
  return rows[0] ? mapWasteType(rows[0]) : null;
}

export async function createWasteType(input: {
  namaSampah: string;
  hargaPerkg: number;
  barcode?: string;
}) {
  await ensureWebDataSchema();
  const [result] = await pool.query<ResultSetHeader>(
    `
      INSERT INTO jenis_sampah (nama_sampah, harga_perkg, barcode)
      VALUES (?, ?, ?)
    `,
    [input.namaSampah.trim(), input.hargaPerkg, input.barcode?.trim() || null]
  );

  const [rows] = await pool.query<WasteTypeRow[]>(
    "SELECT id, nama_sampah, harga_perkg, barcode, created_at FROM jenis_sampah WHERE id = ? LIMIT 1",
    [result.insertId]
  );
  return rows[0] ? mapWasteType(rows[0]) : null;
}

export async function updateWasteType(
  wasteTypeId: number,
  input: { namaSampah?: string; hargaPerkg?: number; barcode?: string | null }
) {
  await ensureWebDataSchema();
  const current = await getWasteTypeById(wasteTypeId);
  if (!current) {
    throw new Error("Jenis sampah tidak ditemukan");
  }

  await pool.query(
    `
      UPDATE jenis_sampah
      SET nama_sampah = ?, harga_perkg = ?, barcode = ?
      WHERE id = ?
    `,
    [
      input.namaSampah?.trim() || current.namaSampah,
      Number.isFinite(input.hargaPerkg) ? input.hargaPerkg : current.hargaPerkg,
      input.barcode === undefined ? current.barcode : input.barcode?.trim() || null,
      wasteTypeId,
    ]
  );

  return getWasteTypeById(wasteTypeId);
}

export async function deleteWasteType(wasteTypeId: number) {
  await ensureWebDataSchema();
  const current = await getWasteTypeById(wasteTypeId);
  if (!current) {
    throw new Error("Jenis sampah tidak ditemukan");
  }

  await pool.query("DELETE FROM jenis_sampah WHERE id = ?", [wasteTypeId]);
  return { success: true };
}

export async function listDeposits(filters?: {
  status?: string;
  q?: string;
  userId?: number;
  page?: number;
  limit?: number;
}) {
  await ensureWebDataSchema();
  const { page, limit, offset } = normalizePagination(filters);
  const params: Array<string | number> = [];
  const conditions: string[] = [];
  if (filters?.status) {
    conditions.push("s.status = ?");
    params.push(filters.status);
  }
  if (filters?.userId) {
    conditions.push("s.user_id = ?");
    params.push(filters.userId);
  }
  if (filters?.q?.trim()) {
    const keyword = `%${filters.q.trim()}%`;
    conditions.push("(u.nama LIKE ? OR j.nama_sampah LIKE ?)");
    params.push(keyword, keyword);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [countRows] = await pool.query<RowDataPacket[]>(
    `
      SELECT COUNT(*) AS count
      FROM setoran s
      LEFT JOIN users u ON u.id = s.user_id
      LEFT JOIN jenis_sampah j ON j.id = s.jenis_sampah_id
      ${whereClause}
    `,
    params
  );

  const [rows] = await pool.query<DepositRow[]>(
    `
      SELECT
        s.id,
        s.user_id,
        u.nama AS customer,
        s.jenis_sampah_id,
        j.nama_sampah AS waste_name,
        s.berat,
        s.total,
        s.status,
        s.petugas_id,
        p.nama AS petugas_nama,
        s.transaksi_id,
        s.balance_applied,
        s.created_at
      FROM setoran s
      LEFT JOIN users u ON u.id = s.user_id
      LEFT JOIN jenis_sampah j ON j.id = s.jenis_sampah_id
      LEFT JOIN users p ON p.id = s.petugas_id
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `,
    [...params, limit, offset]
  );

  return buildPaginatedResult(rows.map(mapDeposit), page, limit, Number(countRows[0]?.count ?? 0));
}

export async function getDepositById(depositId: number) {
  const [rows] = await pool.query<DepositRow[]>(
    `
      SELECT
        s.id,
        s.user_id,
        u.nama AS customer,
        s.jenis_sampah_id,
        j.nama_sampah AS waste_name,
        s.berat,
        s.total,
        s.status,
        s.petugas_id,
        p.nama AS petugas_nama,
        s.transaksi_id,
        s.balance_applied,
        s.created_at
      FROM setoran s
      LEFT JOIN users u ON u.id = s.user_id
      LEFT JOIN jenis_sampah j ON j.id = s.jenis_sampah_id
      LEFT JOIN users p ON p.id = s.petugas_id
      WHERE s.id = ?
      LIMIT 1
    `,
    [depositId]
  );
  return rows[0] ? mapDeposit(rows[0]) : null;
}

export async function createDeposit(input: {
  userId: number;
  jenisSampahId: number;
  berat: number;
  petugasId?: number | null;
  status?: "pending" | "verified" | "rejected";
}) {
  await ensureWebDataSchema();
  const [wasteRows] = await pool.query<RowDataPacket[]>(
    "SELECT id, nama_sampah, harga_perkg FROM jenis_sampah WHERE id = ? LIMIT 1",
    [input.jenisSampahId]
  );
  const waste = wasteRows[0];
  if (!waste) {
    throw new Error("Jenis sampah tidak ditemukan");
  }

  const total = Number(waste.harga_perkg ?? 0) * input.berat;
  const status = input.status ?? "verified";

  const [result] = await pool.query<ResultSetHeader>(
    `
      INSERT INTO setoran (user_id, jenis_sampah_id, berat, total, status, petugas_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [input.userId, input.jenisSampahId, input.berat, total, status, input.petugasId ?? null]
  );

  if (status === "verified") {
    await applyVerifiedDeposit({
      setoranId: result.insertId,
      userId: input.userId,
      berat: input.berat,
      total,
      namaSampah: String(waste.nama_sampah),
    });
  }

  return getDepositById(result.insertId);
}

async function applyVerifiedDeposit(input: {
  setoranId: number;
  userId: number;
  berat: number;
  total: number;
  namaSampah: string;
}) {
  const [setoranRows] = await pool.query<RowDataPacket[]>(
    "SELECT transaksi_id, balance_applied FROM setoran WHERE id = ? LIMIT 1",
    [input.setoranId]
  );
  const setoran = setoranRows[0];
  if (!setoran) {
    throw new Error("Data setoran tidak ditemukan");
  }

  let transaksiId = Number(setoran.transaksi_id ?? 0) || null;

  if (!transaksiId) {
    const [result] = await pool.query<ResultSetHeader>(
      `
        INSERT INTO transaksi (user_id, tipe, jumlah, keterangan, status, berat)
        VALUES (?, 'setor', ?, ?, 'berhasil', ?)
      `,
      [input.userId, input.total, input.namaSampah, input.berat]
    );
    transaksiId = result.insertId;
    await pool.query("UPDATE setoran SET transaksi_id = ? WHERE id = ?", [transaksiId, input.setoranId]);
  }

  if (!Number(setoran.balance_applied ?? 0)) {
    await pool.query(
      `
        INSERT INTO saldo (user_id, total_saldo)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE total_saldo = total_saldo + VALUES(total_saldo)
      `,
      [input.userId, input.total]
    );
    await pool.query("UPDATE setoran SET balance_applied = 1 WHERE id = ?", [input.setoranId]);
  }
}

async function revertVerifiedDeposit(input: { setoranId: number; userId: number; total: number; transaksiId?: number | null }) {
  const [setoranRows] = await pool.query<RowDataPacket[]>(
    "SELECT transaksi_id, balance_applied FROM setoran WHERE id = ? LIMIT 1",
    [input.setoranId]
  );
  const setoran = setoranRows[0];
  if (!setoran) {
    return;
  }

  if (Number(setoran.balance_applied ?? 0)) {
    await pool.query(
      "UPDATE saldo SET total_saldo = GREATEST(total_saldo - ?, 0) WHERE user_id = ?",
      [input.total, input.userId]
    );
    await pool.query("UPDATE setoran SET balance_applied = 0 WHERE id = ?", [input.setoranId]);
  }

  const transaksiId = Number(setoran.transaksi_id ?? input.transaksiId ?? 0);
  if (transaksiId) {
    await pool.query("DELETE FROM transaksi WHERE id = ? AND tipe = 'setor'", [transaksiId]);
    await pool.query("UPDATE setoran SET transaksi_id = NULL WHERE id = ?", [input.setoranId]);
  }
}

export async function updateDepositStatus(input: {
  depositId: number;
  status: "pending" | "verified" | "rejected";
  petugasId?: number | null;
}) {
  await ensureWebDataSchema();
  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT s.id, s.user_id, s.berat, s.total, s.status, s.transaksi_id, s.balance_applied, j.nama_sampah
      FROM setoran s
      LEFT JOIN jenis_sampah j ON j.id = s.jenis_sampah_id
      WHERE s.id = ?
      LIMIT 1
    `,
    [input.depositId]
  );

  const deposit = rows[0];
  if (!deposit) {
    throw new Error("Data setoran tidak ditemukan");
  }

  if (deposit.status !== input.status) {
    await pool.query(
      "UPDATE setoran SET status = ?, petugas_id = ? WHERE id = ?",
      [input.status, input.petugasId ?? null, input.depositId]
    );
  }

  if (deposit.status === "verified" && input.status !== "verified") {
    await revertVerifiedDeposit({
      setoranId: input.depositId,
      userId: Number(deposit.user_id),
      total: Number(deposit.total ?? 0),
      transaksiId: Number(deposit.transaksi_id ?? 0) || null,
    });
  }

  if (deposit.status !== "verified" && input.status === "verified") {
    await applyVerifiedDeposit({
      setoranId: input.depositId,
      userId: Number(deposit.user_id),
      berat: Number(deposit.berat ?? 0),
      total: Number(deposit.total ?? 0),
      namaSampah: String(deposit.nama_sampah ?? "Setoran"),
    });
  }

  return getDepositById(input.depositId);
}

export async function bulkUpdateDepositStatus(input: {
  depositIds: number[];
  status: "pending" | "verified" | "rejected";
  petugasId?: number | null;
}) {
  const updatedItems: ApiDeposit[] = [];
  const skippedIds: number[] = [];

  for (const depositId of input.depositIds) {
    try {
      const item = await updateDepositStatus({
        depositId,
        status: input.status,
        petugasId: input.petugasId ?? null,
      });
      if (item) {
        updatedItems.push(item);
      } else {
        skippedIds.push(depositId);
      }
    } catch {
      skippedIds.push(depositId);
    }
  }

  return {
    updatedItems,
    skippedIds,
    requestedCount: input.depositIds.length,
    updatedCount: updatedItems.length,
  };
}

export async function listWithdrawals(filters?: {
  status?: string;
  q?: string;
  userId?: number;
  page?: number;
  limit?: number;
}) {
  await ensureWebDataSchema();
  const { page, limit, offset } = normalizePagination(filters);
  const params: Array<string | number> = [];
  const conditions: string[] = [];
  if (filters?.status) {
    conditions.push("p.status = ?");
    params.push(filters.status);
  }
  if (filters?.userId) {
    conditions.push("p.user_id = ?");
    params.push(filters.userId);
  }
  if (filters?.q?.trim()) {
    const keyword = `%${filters.q.trim()}%`;
    conditions.push("u.nama LIKE ?");
    params.push(keyword);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [countRows] = await pool.query<RowDataPacket[]>(
    `
      SELECT COUNT(*) AS count
      FROM penarikan p
      LEFT JOIN users u ON u.id = p.user_id
      ${whereClause}
    `,
    params
  );

  const [rows] = await pool.query<WithdrawalRow[]>(
    `
      SELECT p.id, p.user_id, u.nama AS customer, p.jumlah, p.status, p.transaksi_id, p.balance_applied, p.created_at
      FROM penarikan p
      LEFT JOIN users u ON u.id = p.user_id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `,
    [...params, limit, offset]
  );

  return buildPaginatedResult(rows.map(mapWithdrawal), page, limit, Number(countRows[0]?.count ?? 0));
}

export async function getWithdrawalById(withdrawalId: number) {
  const [rows] = await pool.query<WithdrawalRow[]>(
    `
      SELECT p.id, p.user_id, u.nama AS customer, p.jumlah, p.status, p.transaksi_id, p.balance_applied, p.created_at
      FROM penarikan p
      LEFT JOIN users u ON u.id = p.user_id
      WHERE p.id = ?
      LIMIT 1
    `,
    [withdrawalId]
  );
  return rows[0] ? mapWithdrawal(rows[0]) : null;
}

export async function createWithdrawal(input: {
  userId: number;
  jumlah: number;
  status?: "pending" | "success" | "failed";
}) {
  await ensureWebDataSchema();
  const status = input.status ?? "pending";

  const [result] = await pool.query<ResultSetHeader>(
    "INSERT INTO penarikan (user_id, jumlah, status) VALUES (?, ?, ?)",
    [input.userId, input.jumlah, status]
  );

  const [transactionResult] = await pool.query<ResultSetHeader>(
    `
      INSERT INTO transaksi (user_id, tipe, jumlah, keterangan, status, berat)
      VALUES (?, 'tarik', ?, 'Penarikan saldo', ?, NULL)
    `,
    [input.userId, input.jumlah, status]
  );
  await pool.query(
    "UPDATE penarikan SET transaksi_id = ?, balance_applied = ? WHERE id = ?",
    [transactionResult.insertId, status === "success" ? 1 : 0, result.insertId]
  );

  if (status === "success") {
    await pool.query(
      "UPDATE saldo SET total_saldo = GREATEST(total_saldo - ?, 0) WHERE user_id = ?",
      [input.jumlah, input.userId]
    );
  }

  return getWithdrawalById(result.insertId);
}

export async function updateWithdrawalStatus(input: {
  withdrawalId: number;
  status: "pending" | "success" | "failed";
}) {
  await ensureWebDataSchema();
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, user_id, jumlah, status, transaksi_id, balance_applied FROM penarikan WHERE id = ? LIMIT 1",
    [input.withdrawalId]
  );

  const withdrawal = rows[0];
  if (!withdrawal) {
    throw new Error("Data penarikan tidak ditemukan");
  }

  await pool.query(
    "UPDATE penarikan SET status = ? WHERE id = ?",
    [input.status, input.withdrawalId]
  );
  if (withdrawal.transaksi_id) {
    await pool.query(
      "UPDATE transaksi SET status = ? WHERE id = ?",
      [input.status, withdrawal.transaksi_id]
    );
  }

  if (!Number(withdrawal.balance_applied ?? 0) && input.status === "success") {
    await pool.query(
      "UPDATE saldo SET total_saldo = GREATEST(total_saldo - ?, 0) WHERE user_id = ?",
      [withdrawal.jumlah, withdrawal.user_id]
    );
    await pool.query("UPDATE penarikan SET balance_applied = 1 WHERE id = ?", [input.withdrawalId]);
  }

  if (Number(withdrawal.balance_applied ?? 0) && withdrawal.status === "success" && input.status !== "success") {
    await pool.query(
      `
        INSERT INTO saldo (user_id, total_saldo)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE total_saldo = total_saldo + VALUES(total_saldo)
      `,
      [withdrawal.user_id, withdrawal.jumlah]
    );
    await pool.query("UPDATE penarikan SET balance_applied = 0 WHERE id = ?", [input.withdrawalId]);
  }

  return getWithdrawalById(input.withdrawalId);
}

export async function bulkUpdateWithdrawalStatus(input: {
  withdrawalIds: number[];
  status: "pending" | "success" | "failed";
}) {
  const updatedItems: ApiWithdrawal[] = [];
  const skippedIds: number[] = [];

  for (const withdrawalId of input.withdrawalIds) {
    try {
      const item = await updateWithdrawalStatus({
        withdrawalId,
        status: input.status,
      });
      if (item) {
        updatedItems.push(item);
      } else {
        skippedIds.push(withdrawalId);
      }
    } catch {
      skippedIds.push(withdrawalId);
    }
  }

  return {
    updatedItems,
    skippedIds,
    requestedCount: input.withdrawalIds.length,
    updatedCount: updatedItems.length,
  };
}

export async function deleteDeposit(depositId: number) {
  await ensureWebDataSchema();
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, user_id, total, status, transaksi_id FROM setoran WHERE id = ? LIMIT 1",
    [depositId]
  );
  const deposit = rows[0];
  if (!deposit) {
    throw new Error("Data setoran tidak ditemukan");
  }

  if (deposit.status === "verified") {
    await revertVerifiedDeposit({
      setoranId: depositId,
      userId: Number(deposit.user_id),
      total: Number(deposit.total ?? 0),
      transaksiId: Number(deposit.transaksi_id ?? 0) || null,
    });
  }

  await pool.query("DELETE FROM setoran WHERE id = ?", [depositId]);
  return { success: true };
}

export async function deleteWithdrawal(withdrawalId: number) {
  await ensureWebDataSchema();
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, user_id, jumlah, status, transaksi_id, balance_applied FROM penarikan WHERE id = ? LIMIT 1",
    [withdrawalId]
  );
  const withdrawal = rows[0];
  if (!withdrawal) {
    throw new Error("Data penarikan tidak ditemukan");
  }

  if (Number(withdrawal.balance_applied ?? 0)) {
    await pool.query(
      `
        INSERT INTO saldo (user_id, total_saldo)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE total_saldo = total_saldo + VALUES(total_saldo)
      `,
      [withdrawal.user_id, withdrawal.jumlah]
    );
  }

  if (withdrawal.transaksi_id) {
    await pool.query("DELETE FROM transaksi WHERE id = ? AND tipe = 'tarik'", [withdrawal.transaksi_id]);
  }

  await pool.query("DELETE FROM penarikan WHERE id = ?", [withdrawalId]);
  return { success: true };
}

export async function listTransactions(filters?: {
  tipe?: string;
  status?: string;
  userId?: number;
  q?: string;
  page?: number;
  limit?: number;
}) {
  await ensureWebDataSchema();
  const { page, limit, offset } = normalizePagination(filters);
  const conditions: string[] = [];
  const params: Array<string | number> = [];

  if (filters?.tipe) {
    conditions.push("t.tipe = ?");
    params.push(filters.tipe);
  }

  if (filters?.status) {
    conditions.push("t.status = ?");
    params.push(filters.status);
  }

  if (filters?.userId) {
    conditions.push("t.user_id = ?");
    params.push(filters.userId);
  }

  if (filters?.q?.trim()) {
    const keyword = `%${filters.q.trim()}%`;
    conditions.push("(u.nama LIKE ? OR t.keterangan LIKE ?)");
    params.push(keyword, keyword);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [countRows] = await pool.query<RowDataPacket[]>(
    `
      SELECT COUNT(*) AS count
      FROM transaksi t
      LEFT JOIN users u ON u.id = t.user_id
      ${whereClause}
    `,
    params
  );

  const [rows] = await pool.query<TransactionRow[]>(
    `
      SELECT t.id, t.user_id, u.nama AS customer, t.tipe, t.jumlah, t.keterangan, t.status, t.created_at, t.berat
      FROM transaksi t
      LEFT JOIN users u ON u.id = t.user_id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `,
    [...params, limit, offset]
  );

  return buildPaginatedResult(rows.map(mapTransaction), page, limit, Number(countRows[0]?.count ?? 0));
}

export async function getAdminSummary() {
  await ensureWebDataSchema();
  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT
        (SELECT COUNT(*) FROM setoran WHERE status = 'pending') AS pending_deposits,
        (SELECT COUNT(*) FROM penarikan WHERE status = 'pending') AS pending_withdrawals,
        (SELECT COUNT(*) FROM users WHERE role = 'nasabah') AS total_members,
        (SELECT COUNT(*) FROM jenis_sampah) AS total_waste_types,
        (SELECT COUNT(*) FROM transaksi WHERE DATE(created_at) = CURDATE()) AS transactions_today
    `
  );

  const row = rows[0] ?? {};
  return {
    pendingDeposits: Number(row.pending_deposits ?? 0),
    pendingWithdrawals: Number(row.pending_withdrawals ?? 0),
    totalMembers: Number(row.total_members ?? 0),
    totalWasteTypes: Number(row.total_waste_types ?? 0),
    transactionsToday: Number(row.transactions_today ?? 0),
  };
}

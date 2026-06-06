import { RowDataPacket } from "mysql2";
import pool from "./db";

type Direction = "credit" | "debit";
type HistoryCategory = "semua" | "setoran" | "penarikan" | "reward";

type UserProfile = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  bankName: string;
  accountNumber: string;
  avatar: string;
};

type Summary = {
  balance: number;
  points: number;
  collectedKg: number;
  notificationsUnread: number;
};

type HistoryItem = {
  id: string;
  title: string;
  category: Exclude<HistoryCategory, "semua">;
  date: string;
  amount: number;
  direction: Direction;
  subtitle: string;
  weightKg: number;
};

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
};

type MemberRow = RowDataPacket & {
  id: number;
  nama: string;
  email: string;
  no_hp: string;
  alamat: string | null;
};

const DEFAULT_REWARDS = [
  { id: "reward-1", title: "Pulsa 10.000", points: 500, badge: "Pulsa" },
  { id: "reward-2", title: "Pulsa 20.000", points: 1000, badge: "Pulsa" },
  { id: "reward-3", title: "Sembako Paket", points: 1500, badge: "Hadiah" },
  { id: "reward-4", title: "Voucher Belanja 25rb", points: 1200, badge: "Voucher" },
];

let mobileDataReady = false;

async function ensureMobileTables() {
  if (mobileDataReady) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS mobile_member_meta (
      member_id INT PRIMARY KEY,
      points INT NOT NULL DEFAULT 0,
      bank_name VARCHAR(120) NOT NULL DEFAULT 'Bank BRI',
      account_number VARCHAR(64) NOT NULL DEFAULT '',
      CONSTRAINT fk_mobile_meta_member
        FOREIGN KEY (member_id) REFERENCES users(id)
        ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS mobile_rewards (
      id VARCHAR(64) PRIMARY KEY,
      title VARCHAR(120) NOT NULL,
      points INT NOT NULL DEFAULT 0,
      badge VARCHAR(50) NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS mobile_notifications (
      id VARCHAR(64) PRIMARY KEY,
      member_id INT NOT NULL,
      title VARCHAR(180) NOT NULL,
      message TEXT NOT NULL,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_mobile_notifications_member
        FOREIGN KEY (member_id) REFERENCES users(id)
        ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS mobile_reward_history (
      id VARCHAR(64) PRIMARY KEY,
      member_id INT NOT NULL,
      reward_id VARCHAR(64) NOT NULL,
      title VARCHAR(120) NOT NULL,
      points INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_mobile_reward_history_member
        FOREIGN KEY (member_id) REFERENCES users(id)
        ON DELETE CASCADE
    )
  `);

  await seedMobileData();
  mobileDataReady = true;
}

async function seedMobileData() {
  const [metaRows] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM users WHERE role = 'nasabah'"
  );

  for (const row of metaRows) {
    await pool.query(
      `
        INSERT INTO mobile_member_meta (member_id, points, bank_name, account_number)
        VALUES (?, 0, 'Bank BRI', '')
        ON DUPLICATE KEY UPDATE member_id = member_id
      `,
      [row.id]
    );
  }

  const [rewardRows] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS count FROM mobile_rewards");
  if (Number(rewardRows[0]?.count ?? 0) === 0) {
    for (const reward of DEFAULT_REWARDS) {
      await pool.query(
        "INSERT INTO mobile_rewards (id, title, points, badge) VALUES (?, ?, ?, ?)",
        [reward.id, reward.title, reward.points, reward.badge]
      );
    }
  }
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date).replace(".", ":").replace(" pukul ", " - ");
}

function avatarFromName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "BS";
}

async function getMemberRow(memberId: string) {
  await ensureMobileTables();
  const numericId = Number(memberId);
  const [rows] = await pool.query<MemberRow[]>(
    `
      SELECT id, nama, email, no_hp, alamat
      FROM users
      WHERE id = ? AND role = 'nasabah'
      LIMIT 1
    `,
    [numericId]
  );

  const member = rows[0];
  if (!member) {
    throw new Error("Member tidak ditemukan");
  }

  return member;
}

async function getMemberMeta(memberId: string) {
  await ensureMobileTables();
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT points, bank_name, account_number FROM mobile_member_meta WHERE member_id = ? LIMIT 1",
    [Number(memberId)]
  );

  return {
    points: Number(rows[0]?.points ?? 0),
    bankName: String(rows[0]?.bank_name ?? "Bank BRI"),
    accountNumber: String(rows[0]?.account_number ?? ""),
  };
}

async function getBalance(memberId: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT total_saldo FROM saldo WHERE user_id = ? LIMIT 1",
    [Number(memberId)]
  );
  return Number(rows[0]?.total_saldo ?? 0);
}

async function setBalance(memberId: string, totalSaldo: number) {
  await pool.query(
    `
      INSERT INTO saldo (user_id, total_saldo)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE total_saldo = VALUES(total_saldo)
    `,
    [Number(memberId), totalSaldo]
  );
}

async function setMeta(memberId: string, values: { points?: number; bankName?: string; accountNumber?: string }) {
  const current = await getMemberMeta(memberId);
  await pool.query(
    `
      UPDATE mobile_member_meta
      SET points = ?, bank_name = ?, account_number = ?
      WHERE member_id = ?
    `,
    [
      values.points ?? current.points,
      values.bankName ?? current.bankName,
      values.accountNumber ?? current.accountNumber,
      Number(memberId),
    ]
  );
}

async function getSummary(memberId: string): Promise<Summary> {
  const [collectedRows, notificationRows, meta, balance] = await Promise.all([
    pool.query<RowDataPacket[]>(
      "SELECT COALESCE(SUM(berat), 0) AS total_kg FROM transaksi WHERE user_id = ? AND tipe = 'setor' AND status = 'berhasil'",
      [Number(memberId)]
    ),
    pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS count FROM mobile_notifications WHERE member_id = ? AND is_read = 0",
      [Number(memberId)]
    ),
    getMemberMeta(memberId),
    getBalance(memberId),
  ]);

  return {
    balance,
    points: meta.points,
    collectedKg: Number(collectedRows[0][0]?.total_kg ?? 0),
    notificationsUnread: Number(notificationRows[0][0]?.count ?? 0),
  };
}

async function getWasteCatalog() {
  await ensureMobileTables();
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, nama_sampah, harga_perkg FROM jenis_sampah ORDER BY nama_sampah ASC"
  );

  return rows.map((row) => ({
    id: String(row.id),
    label: String(row.nama_sampah),
    pricePerKg: Number(row.harga_perkg ?? 0),
  }));
}

async function getRewards() {
  await ensureMobileTables();
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, title, points, badge FROM mobile_rewards ORDER BY points ASC"
  );

  return rows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    points: Number(row.points ?? 0),
    badge: String(row.badge),
  }));
}

function mapTransactionHistory(row: RowDataPacket): HistoryItem {
  const date = row.created_at ? new Date(row.created_at) : new Date();
  const isSetor = row.tipe === "setor";
  return {
    id: `trx-${row.id}`,
    title: isSetor ? `Setor ${row.keterangan}` : `Penarikan ${row.keterangan || "Saldo"}`,
    category: isSetor ? "setoran" : "penarikan",
    date: date.toISOString(),
    amount: Number(row.jumlah ?? 0),
    direction: isSetor ? "credit" : "debit",
    subtitle: formatDate(date),
    weightKg: Number(row.berat ?? 0),
  };
}

function mapRewardHistory(row: RowDataPacket): HistoryItem {
  const date = row.created_at ? new Date(row.created_at) : new Date();
  return {
    id: String(row.id),
    title: `Tukar Poin (${row.title})`,
    category: "reward",
    date: date.toISOString(),
    amount: Number(row.points ?? 0) * 20,
    direction: "debit",
    subtitle: formatDate(date),
    weightKg: 0,
  };
}

async function getHistoryItems(memberId: string, filter: HistoryCategory = "semua") {
  await ensureMobileTables();

  const items: HistoryItem[] = [];
  if (filter === "semua" || filter === "setoran" || filter === "penarikan") {
    const [rows] = await pool.query<RowDataPacket[]>(
      `
        SELECT id, tipe, jumlah, keterangan, status, created_at, berat
        FROM transaksi
        WHERE user_id = ?
        ORDER BY created_at DESC
      `,
      [Number(memberId)]
    );
    items.push(
      ...rows
        .map(mapTransactionHistory)
        .filter((item) => filter === "semua" || item.category === filter)
    );
  }

  if (filter === "semua" || filter === "reward") {
    const [rewardRows] = await pool.query<RowDataPacket[]>(
      `
        SELECT id, title, points, created_at
        FROM mobile_reward_history
        WHERE member_id = ?
        ORDER BY created_at DESC
      `,
      [Number(memberId)]
    );
    items.push(...rewardRows.map(mapRewardHistory));
  }

  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

async function addNotification(memberId: string, title: string, message: string) {
  await pool.query(
    `
      INSERT INTO mobile_notifications (id, member_id, title, message, is_read)
      VALUES (?, ?, ?, ?, 0)
    `,
    [createId("notif"), Number(memberId), title, message]
  );
}

export async function getMobileBootstrap(memberId: string) {
  const [member, meta, summary, wasteCatalog, rewards, latestHistory, notificationsPreview] = await Promise.all([
    getMemberRow(memberId),
    getMemberMeta(memberId),
    getSummary(memberId),
    getWasteCatalog(),
    getRewards(),
    getHistoryItems(memberId),
    getMobileNotifications(memberId),
  ]);

  return {
    user: {
      id: String(member.id),
      name: member.nama,
      phone: member.no_hp ?? "",
      email: member.email,
      address: member.alamat ?? "",
      bankName: meta.bankName,
      accountNumber: meta.accountNumber,
      avatar: avatarFromName(member.nama),
    },
    summary,
    wasteCatalog,
    rewards,
    latestHistory: latestHistory.slice(0, 5),
    notificationsPreview: notificationsPreview.items.slice(0, 4),
  };
}

export async function getMobileHistory(memberId: string, filter: HistoryCategory = "semua") {
  return { items: await getHistoryItems(memberId, filter) };
}

export async function getMobileNotifications(memberId: string) {
  await ensureMobileTables();
  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT id, title, message, is_read, created_at
      FROM mobile_notifications
      WHERE member_id = ?
      ORDER BY created_at DESC
    `,
    [Number(memberId)]
  );

  return {
    items: rows.map((row) => ({
      id: String(row.id),
      title: String(row.title),
      message: String(row.message),
      date: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      read: Boolean(row.is_read),
    })),
  };
}

export async function markNotificationsRead(memberId: string) {
  await ensureMobileTables();
  await pool.query("UPDATE mobile_notifications SET is_read = 1 WHERE member_id = ?", [Number(memberId)]);
  return { success: true };
}

export async function submitDeposit(memberId: string, payload: { wasteTypeId: string; weightKg: number }) {
  await ensureMobileTables();
  if (!Number.isFinite(payload.weightKg) || payload.weightKg <= 0) {
    throw new Error("Berat setoran harus lebih dari 0");
  }

  const [wasteRows] = await pool.query<RowDataPacket[]>(
    "SELECT id, nama_sampah, harga_perkg FROM jenis_sampah WHERE id = ? LIMIT 1",
    [Number(payload.wasteTypeId)]
  );
  const waste = wasteRows[0];
  if (!waste) {
    throw new Error("Jenis sampah tidak ditemukan");
  }

  const amount = Number(waste.harga_perkg ?? 0) * payload.weightKg;
  const currentBalance = await getBalance(memberId);
  const currentMeta = await getMemberMeta(memberId);

  await pool.query(
    `
      INSERT INTO setoran (user_id, jenis_sampah_id, berat, total, status, created_at)
      VALUES (?, ?, ?, ?, 'verified', NOW())
    `,
    [Number(memberId), Number(waste.id), payload.weightKg, amount]
  );
  await pool.query(
    `
      INSERT INTO transaksi (user_id, tipe, jumlah, keterangan, status, created_at, berat)
      VALUES (?, 'setor', ?, ?, 'berhasil', NOW(), ?)
    `,
    [Number(memberId), amount, waste.nama_sampah, payload.weightKg]
  );
  await setBalance(memberId, currentBalance + amount);
  await setMeta(memberId, { points: currentMeta.points + Math.round(payload.weightKg * 10) });
  await addNotification(
    memberId,
    "Setoran diterima",
    `Setoran ${String(waste.nama_sampah).toLowerCase()} ${payload.weightKg} Kg berhasil disimpan. Saldo bertambah Rp ${amount.toLocaleString("id-ID")}.`
  );

  return {
    success: true,
    message: "Setoran berhasil dikirim",
    summary: await getSummary(memberId),
    latestHistory: (await getHistoryItems(memberId)).slice(0, 5),
  };
}

export async function redeemReward(memberId: string, payload: { rewardId: string }) {
  await ensureMobileTables();
  const [rewardRows] = await pool.query<RowDataPacket[]>(
    "SELECT id, title, points FROM mobile_rewards WHERE id = ? LIMIT 1",
    [payload.rewardId]
  );
  const reward = rewardRows[0];
  if (!reward) {
    throw new Error("Reward tidak ditemukan");
  }

  const currentMeta = await getMemberMeta(memberId);
  const points = Number(reward.points ?? 0);
  if (currentMeta.points < points) {
    throw new Error("Poin Anda belum cukup");
  }

  await pool.query(
    `
      INSERT INTO mobile_reward_history (id, member_id, reward_id, title, points, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
    `,
    [createId("reward"), Number(memberId), reward.id, reward.title, points]
  );
  await setMeta(memberId, { points: currentMeta.points - points });
  await addNotification(memberId, "Tukar poin berhasil", `Anda berhasil menukar ${points} poin menjadi ${reward.title}.`);

  return {
    success: true,
    message: "Reward berhasil ditukar",
    summary: await getSummary(memberId),
    latestHistory: (await getHistoryItems(memberId)).slice(0, 5),
  };
}

export async function requestWithdrawal(memberId: string, payload: { amount: number; method: string; accountNumber: string }) {
  await ensureMobileTables();
  if (!Number.isFinite(payload.amount) || payload.amount < 10000) {
    throw new Error("Minimal penarikan Rp 10.000");
  }

  const currentBalance = await getBalance(memberId);
  if (currentBalance < payload.amount) {
    throw new Error("Saldo Anda tidak mencukupi");
  }

  await pool.query(
    "INSERT INTO penarikan (user_id, jumlah, status, created_at) VALUES (?, ?, 'pending', NOW())",
    [Number(memberId), payload.amount]
  );
  await pool.query(
    `
      INSERT INTO transaksi (user_id, tipe, jumlah, keterangan, status, created_at, berat)
      VALUES (?, 'tarik', ?, ?, 'pending', NOW(), NULL)
    `,
    [Number(memberId), payload.amount, payload.method]
  );
  await setBalance(memberId, currentBalance - payload.amount);
  await setMeta(memberId, { accountNumber: payload.accountNumber });
  await addNotification(
    memberId,
    "Penarikan diproses",
    `Permintaan penarikan Rp ${payload.amount.toLocaleString("id-ID")} melalui ${payload.method} sedang diproses admin.`
  );

  return {
    success: true,
    message: "Permintaan penarikan dikirim",
    summary: await getSummary(memberId),
    latestHistory: (await getHistoryItems(memberId)).slice(0, 5),
  };
}

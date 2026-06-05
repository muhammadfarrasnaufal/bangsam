import { RowDataPacket } from "mysql2";
import pool from "./db";

type Transaction = {
  id: string;
  customer: string;
  type: string;
  amount: string;
  status: string;
  createdAt: string;
};

type Stats = {
  totalSetoranKg: number;
  saldoPoinRp: number;
  anggotaAktif: number;
  transaksiHariIni: number;
};

type DashboardState = {
  stats: Stats;
  recentTransactions: Transaction[];
  activeUsers: string[];
  activeFeatures: string[];
  programHighlights: Array<{ title: string; description: string }>;
  lastUpdated: string;
  demoMode?: boolean;
};

type ReportState = {
  stats: Stats;
  reportTransactions: Transaction[];
  reportStats: {
    totalSetoranKg: number;
    saldoPoinRp: number;
    transaksiCount: number;
    uniqueUsers: number;
  };
  start: string;
  end: string;
  demoMode?: boolean;
};

const activeFeatures = ["Dashboard", "Transaksi", "Setoran", "Anggota", "Laporan"];
const programHighlights = [
  { title: "Edukasi Sampah", description: "Mengajak anggota memilah dan menabung sampah dengan lebih baik." },
  { title: "Penjemputan", description: "Layanan jemput sampah terjadwal di lingkungan komunitas." },
  { title: "Tukar Poin", description: "Tukar hasil sampah dengan uang tunai dan hadiah." },
];

const customers = ["Ayu Putri", "Dedi Permana", "Fajar Pratama", "Rina Safitri", "Tono Santoso", "Budi Santoso", "Siti Nur", "Joko Widodo", "Dewi Ayu"];
const types = ["Plastik", "Kertas", "Logam", "Kaca", "Kain"];
const statuses = ["Selesai", "Menunggu", "Dibatalkan"];

const defaultStats: Stats = {
  totalSetoranKg: 0,
  saldoPoinRp: 0,
  anggotaAktif: 0,
  transaksiHariIni: 0,
};

const memoryState: DashboardState = {
  stats: { ...defaultStats },
  recentTransactions: [],
  activeUsers: [],
  activeFeatures,
  programHighlights,
  lastUpdated: new Date().toISOString(),
  demoMode: true,
};

let dbAvailable = true;

async function ensureDatabase() {
  if (!dbAvailable) return;

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stats (
        id INT PRIMARY KEY,
        total_setoran_kg INT NOT NULL DEFAULT 0,
        saldo_poin_rp BIGINT NOT NULL DEFAULT 0,
        anggota_aktif INT NOT NULL DEFAULT 0,
        transaksi_hari_ini INT NOT NULL DEFAULT 0,
        last_updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(64) PRIMARY KEY,
        customer VARCHAR(120) NOT NULL,
        type VARCHAR(50) NOT NULL,
        amount VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const [rows] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) as count FROM stats WHERE id = 1");
    if (rows[0].count === 0) {
      await pool.query("INSERT INTO stats (id, last_updated) VALUES (1, NOW())");
    }
  } catch (error) {
    console.error("MySQL unavailable, fallback to demo mode:", error);
    dbAvailable = false;
  }
}

function getRandomItem<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function createTransaction(): Transaction {
  const amountKg = [2, 3, 4, 5, 6, 7][Math.floor(Math.random() * 6)];
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    customer: getRandomItem(customers),
    type: getRandomItem(types),
    amount: `${amountKg} kg`,
    status: getRandomItem(statuses),
    createdAt: new Date().toISOString(),
  };
}

function parseAmount(amount: string) {
  return Number(amount.replace(/\D/g, "")) || 0;
}

function mapStats(row: RowDataPacket): Stats {
  return {
    totalSetoranKg: row.total_setoran_kg ?? 0,
    saldoPoinRp: Number(row.saldo_poin_rp ?? 0),
    anggotaAktif: row.anggota_aktif ?? 0,
    transaksiHariIni: row.transaksi_hari_ini ?? 0,
  };
}

function mapTransaction(row: RowDataPacket): Transaction {
  return {
    id: row.id,
    customer: row.customer,
    type: row.type,
    amount: row.amount,
    status: row.status,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

function getMemoryState(): DashboardState {
  return {
    ...memoryState,
    stats: { ...memoryState.stats },
    recentTransactions: [...memoryState.recentTransactions],
    activeUsers: [...memoryState.activeUsers],
    lastUpdated: new Date(memoryState.lastUpdated).toISOString(),
    demoMode: true,
  };
}

export async function getDashboardState(): Promise<DashboardState> {
  await ensureDatabase();

  if (!dbAvailable) {
    return getMemoryState();
  }

  try {
    const [statsRows] = await pool.query<RowDataPacket[]>("SELECT * FROM stats WHERE id = 1 LIMIT 1");
    const stats = statsRows.length > 0 ? mapStats(statsRows[0]) : defaultStats;

    const [transactionRows] = await pool.query<RowDataPacket[]>(
      "SELECT id, customer, type, amount, status, created_at FROM transactions ORDER BY created_at DESC LIMIT 5"
    );

    const recentTransactions = transactionRows.map(mapTransaction);

    const [userRows] = await pool.query<RowDataPacket[]>(
      "SELECT DISTINCT customer FROM transactions ORDER BY created_at DESC LIMIT 5"
    );
    const activeUsers = userRows.map((row) => row.customer);

    const lastUpdated = statsRows[0]?.last_updated
      ? new Date(statsRows[0].last_updated).toISOString()
      : new Date().toISOString();

    return {
      stats,
      recentTransactions,
      activeUsers,
      activeFeatures,
      programHighlights,
      lastUpdated,
      demoMode: false,
    };
  } catch (error) {
    console.error("MySQL query failed, fallback to demo mode:", error);
    dbAvailable = false;
    return getMemoryState();
  }
}

export async function getReportState(start: string, end: string): Promise<ReportState> {
  await ensureDatabase();

  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error("Invalid date range");
  }

  if (!dbAvailable) {
    const filteredTransactions = memoryState.recentTransactions.filter((tx) => {
      const created = new Date(tx.createdAt);
      return created >= startDate && created <= endDate;
    });
    const totalSetoranKg = filteredTransactions.reduce((sum, tx) => sum + parseAmount(tx.amount), 0);
    const uniqueUsers = new Set(filteredTransactions.map((tx) => tx.customer)).size;

    return {
      stats: memoryState.stats,
      reportTransactions: filteredTransactions,
      reportStats: {
        totalSetoranKg,
        saldoPoinRp: totalSetoranKg * 1750,
        transaksiCount: filteredTransactions.length,
        uniqueUsers,
      },
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      demoMode: true,
    };
  }

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, customer, type, amount, status, created_at FROM transactions WHERE created_at BETWEEN ? AND ? ORDER BY created_at DESC",
      [startDate, endDate]
    );
    const reportTransactions = rows.map(mapTransaction);
    const totalSetoranKg = reportTransactions.reduce((sum, tx) => sum + parseAmount(tx.amount), 0);
    const [uniqueRows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(DISTINCT customer) as count FROM transactions WHERE created_at BETWEEN ? AND ?",
      [startDate, endDate]
    );
    const uniqueUsers = Number(uniqueRows[0]?.count ?? 0);

    return {
      stats: defaultStats,
      reportTransactions,
      reportStats: {
        totalSetoranKg,
        saldoPoinRp: totalSetoranKg * 1750,
        transaksiCount: reportTransactions.length,
        uniqueUsers,
      },
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      demoMode: false,
    };
  } catch (error) {
    console.error("MySQL report query failed, fallback to demo mode:", error);
    dbAvailable = false;
    return getReportState(start, end);
  }
}

export async function addTransaction(): Promise<DashboardState> {
  await ensureDatabase();

  const transaction = createTransaction();
  const amountValue = parseInt(transaction.amount, 10);

  if (!dbAvailable) {
    memoryState.recentTransactions.unshift(transaction);
    memoryState.recentTransactions = memoryState.recentTransactions.slice(0, 5);
    memoryState.stats.totalSetoranKg += amountValue;
    memoryState.stats.saldoPoinRp += amountValue * 1750;
    memoryState.stats.transaksiHariIni += 1;
    if (!memoryState.activeUsers.includes(transaction.customer)) {
      memoryState.activeUsers.unshift(transaction.customer);
      memoryState.activeUsers = memoryState.activeUsers.slice(0, 5);
      memoryState.stats.anggotaAktif += 1;
    }
    memoryState.lastUpdated = new Date().toISOString();
    return getMemoryState();
  }

  try {
    await pool.query(
      "INSERT INTO transactions (id, customer, type, amount, status) VALUES (?, ?, ?, ?, ?)",
      [transaction.id, transaction.customer, transaction.type, transaction.amount, transaction.status]
    );

    const [statsRows] = await pool.query<RowDataPacket[]>("SELECT * FROM stats WHERE id = 1 LIMIT 1");
    const prevStats = statsRows.length > 0 ? mapStats(statsRows[0]) : defaultStats;

    const totalSetoranKg = prevStats.totalSetoranKg + amountValue;
    const saldoPoinRp = prevStats.saldoPoinRp + amountValue * 1750;
    const transaksiHariIni = prevStats.transaksiHariIni + 1;

    const [userRows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(DISTINCT customer) as count FROM transactions"
    );
    const anggotaAktif = Number(userRows[0]?.count ?? 0);

    await pool.query(
      "UPDATE stats SET total_setoran_kg = ?, saldo_poin_rp = ?, transaksi_hari_ini = ?, anggota_aktif = ?, last_updated = NOW() WHERE id = 1",
      [totalSetoranKg, saldoPoinRp, transaksiHariIni, anggotaAktif]
    );

    return getDashboardState();
  } catch (error) {
    console.error("MySQL transaction insert failed, fallback to demo mode:", error);
    dbAvailable = false;
    return addTransaction();
  }
}

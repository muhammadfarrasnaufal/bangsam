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

type AnalyticsState = {
  period: {
    start: string;
    end: string;
  };
  operationalSummary: {
    pendingDeposits: number;
    pendingWithdrawals: number;
    verifiedDeposits: number;
    successfulWithdrawals: number;
  };
  dailyTrend: Array<{
    date: string;
    totalSetoranKg: number;
    totalSetoranRp: number;
    transactionCount: number;
  }>;
  wasteBreakdown: Array<{
    wasteType: string;
    totalSetoranKg: number;
    totalSetoranRp: number;
    transactionCount: number;
  }>;
  topMembers: Array<{
    memberId: number | null;
    memberName: string;
    totalSetoranKg: number;
    totalSetoranRp: number;
    transactionCount: number;
  }>;
  statusBreakdown: Array<{
    status: string;
    count: number;
  }>;
};

type AdminAlert = {
  id: string;
  level: "info" | "warning" | "critical";
  category: "deposit" | "withdrawal" | "member" | "system" | "report";
  title: string;
  description: string;
  count: number;
  actionLabel: string;
  actionTarget: string;
};

const activeFeatures = ["Dashboard", "Transaksi", "Setoran", "Anggota", "Laporan"];
const programHighlights = [
  { title: "Edukasi Sampah", description: "Mengajak anggota memilah dan menabung sampah dengan lebih baik." },
  { title: "Penjemputan", description: "Layanan jemput sampah terjadwal di lingkungan komunitas." },
  { title: "Tukar Poin", description: "Tukar hasil sampah dengan uang tunai dan hadiah." },
];

const defaultStats: Stats = {
  totalSetoranKg: 0,
  saldoPoinRp: 0,
  anggotaAktif: 0,
  transaksiHariIni: 0,
};

function startOfDay(value: string) {
  return `${value} 00:00:00`;
}

function endOfDay(value: string) {
  return `${value} 23:59:59`;
}

function formatStatus(status: string) {
  if (!status) {
    return "-";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function mapTransaction(row: RowDataPacket): Transaction {
  const isSetor = row.tipe === "setor";
  const amount = isSetor
    ? `${Number(row.berat ?? 0).toLocaleString("id-ID")} kg`
    : `Rp ${Number(row.jumlah ?? 0).toLocaleString("id-ID")}`;

  return {
    id: String(row.id),
    customer: String(row.customer ?? "Tanpa Nama"),
    type: String(row.keterangan || (isSetor ? "Setoran" : "Penarikan")),
    amount,
    status: formatStatus(String(row.status ?? "")),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

function emptyDashboardState(): DashboardState {
  return {
    stats: defaultStats,
    recentTransactions: [],
    activeUsers: [],
    activeFeatures,
    programHighlights,
    lastUpdated: new Date().toISOString(),
    demoMode: true,
  };
}

export async function getDashboardState(): Promise<DashboardState> {
  try {
    const [statsRows] = await pool.query<RowDataPacket[]>(
      `
        SELECT
          COALESCE(SUM(CASE WHEN tipe = 'setor' AND status = 'berhasil' THEN berat ELSE 0 END), 0) AS total_setoran_kg,
          COALESCE(SUM(CASE WHEN tipe = 'setor' AND status = 'berhasil' THEN jumlah ELSE 0 END), 0) AS saldo_poin_rp,
          (SELECT COUNT(*) FROM users WHERE role = 'nasabah') AS anggota_aktif,
          (SELECT COUNT(*) FROM transaksi WHERE DATE(created_at) = CURDATE()) AS transaksi_hari_ini,
          MAX(created_at) AS last_updated
        FROM transaksi
      `
    );

    const [transactionRows] = await pool.query<RowDataPacket[]>(
      `
        SELECT t.id, u.nama AS customer, t.tipe, t.jumlah, t.keterangan, t.status, t.created_at, t.berat
        FROM transaksi t
        LEFT JOIN users u ON u.id = t.user_id
        ORDER BY t.created_at DESC
        LIMIT 5
      `
    );

    const [userRows] = await pool.query<RowDataPacket[]>(
      `
        SELECT DISTINCT u.nama AS customer
        FROM transaksi t
        INNER JOIN users u ON u.id = t.user_id
        ORDER BY t.created_at DESC
        LIMIT 5
      `
    );

    const row = statsRows[0];
    return {
      stats: {
        totalSetoranKg: Number(row?.total_setoran_kg ?? 0),
        saldoPoinRp: Number(row?.saldo_poin_rp ?? 0),
        anggotaAktif: Number(row?.anggota_aktif ?? 0),
        transaksiHariIni: Number(row?.transaksi_hari_ini ?? 0),
      },
      recentTransactions: transactionRows.map(mapTransaction),
      activeUsers: userRows.map((entry) => String(entry.customer)),
      activeFeatures,
      programHighlights,
      lastUpdated: row?.last_updated ? new Date(row.last_updated).toISOString() : new Date().toISOString(),
      demoMode: false,
    };
  } catch (error) {
    console.error("MySQL unavailable, fallback to demo mode:", error);
    return emptyDashboardState();
  }
}

export async function getReportState(start: string, end: string): Promise<ReportState> {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error("Invalid date range");
  }

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `
        SELECT t.id, u.nama AS customer, t.tipe, t.jumlah, t.keterangan, t.status, t.created_at, t.berat
        FROM transaksi t
        LEFT JOIN users u ON u.id = t.user_id
        WHERE t.created_at BETWEEN ? AND ?
        ORDER BY t.created_at DESC
      `,
      [startOfDay(start), endOfDay(end)]
    );

    const reportTransactions = rows.map(mapTransaction);
    const totalSetoranKg = rows.reduce((sum, row) => {
      if (row.tipe !== "setor" || row.status !== "berhasil") {
        return sum;
      }

      return sum + Number(row.berat ?? 0);
    }, 0);
    const saldoPoinRp = rows.reduce((sum, row) => {
      if (row.tipe !== "setor" || row.status !== "berhasil") {
        return sum;
      }

      return sum + Number(row.jumlah ?? 0);
    }, 0);
    const uniqueUsers = new Set(rows.map((row) => String(row.customer ?? ""))).size;

    return {
      stats: defaultStats,
      reportTransactions,
      reportStats: {
        totalSetoranKg,
        saldoPoinRp,
        transaksiCount: rows.length,
        uniqueUsers,
      },
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      demoMode: false,
    };
  } catch (error) {
    console.error("MySQL report query failed:", error);
    return {
      stats: defaultStats,
      reportTransactions: [],
      reportStats: {
        totalSetoranKg: 0,
        saldoPoinRp: 0,
        transaksiCount: 0,
        uniqueUsers: 0,
      },
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      demoMode: true,
    };
  }
}

export async function addTransaction(): Promise<DashboardState> {
  return getDashboardState();
}

export async function getAnalyticsState(start: string, end: string): Promise<AnalyticsState> {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error("Invalid date range");
  }

  try {
    const [summaryRows, dailyRows, wasteRows, memberRows, statusRows] = await Promise.all([
      pool.query<RowDataPacket[]>(
        `
          SELECT
            (SELECT COUNT(*) FROM setoran WHERE status = 'pending' AND created_at BETWEEN ? AND ?) AS pending_deposits,
            (SELECT COUNT(*) FROM penarikan WHERE status = 'pending' AND created_at BETWEEN ? AND ?) AS pending_withdrawals,
            (SELECT COUNT(*) FROM setoran WHERE status = 'verified' AND created_at BETWEEN ? AND ?) AS verified_deposits,
            (SELECT COUNT(*) FROM penarikan WHERE status = 'success' AND created_at BETWEEN ? AND ?) AS successful_withdrawals
        `,
        [startOfDay(start), endOfDay(end), startOfDay(start), endOfDay(end), startOfDay(start), endOfDay(end), startOfDay(start), endOfDay(end)]
      ),
      pool.query<RowDataPacket[]>(
        `
          SELECT
            DATE(created_at) AS date,
            COALESCE(SUM(CASE WHEN tipe = 'setor' AND status = 'berhasil' THEN berat ELSE 0 END), 0) AS total_setoran_kg,
            COALESCE(SUM(CASE WHEN tipe = 'setor' AND status = 'berhasil' THEN jumlah ELSE 0 END), 0) AS total_setoran_rp,
            COUNT(*) AS transaction_count
          FROM transaksi
          WHERE created_at BETWEEN ? AND ?
          GROUP BY DATE(created_at)
          ORDER BY DATE(created_at) ASC
        `,
        [startOfDay(start), endOfDay(end)]
      ),
      pool.query<RowDataPacket[]>(
        `
          SELECT
            COALESCE(keterangan, 'Lainnya') AS waste_type,
            COALESCE(SUM(CASE WHEN tipe = 'setor' AND status = 'berhasil' THEN berat ELSE 0 END), 0) AS total_setoran_kg,
            COALESCE(SUM(CASE WHEN tipe = 'setor' AND status = 'berhasil' THEN jumlah ELSE 0 END), 0) AS total_setoran_rp,
            COUNT(*) AS transaction_count
          FROM transaksi
          WHERE created_at BETWEEN ? AND ?
            AND tipe = 'setor'
          GROUP BY COALESCE(keterangan, 'Lainnya')
          ORDER BY total_setoran_rp DESC, total_setoran_kg DESC
          LIMIT 10
        `,
        [startOfDay(start), endOfDay(end)]
      ),
      pool.query<RowDataPacket[]>(
        `
          SELECT
            u.id AS member_id,
            COALESCE(u.nama, 'Tanpa Nama') AS member_name,
            COALESCE(SUM(CASE WHEN t.tipe = 'setor' AND t.status = 'berhasil' THEN t.berat ELSE 0 END), 0) AS total_setoran_kg,
            COALESCE(SUM(CASE WHEN t.tipe = 'setor' AND t.status = 'berhasil' THEN t.jumlah ELSE 0 END), 0) AS total_setoran_rp,
            COUNT(*) AS transaction_count
          FROM transaksi t
          LEFT JOIN users u ON u.id = t.user_id
          WHERE t.created_at BETWEEN ? AND ?
          GROUP BY u.id, u.nama
          ORDER BY total_setoran_rp DESC, total_setoran_kg DESC, transaction_count DESC
          LIMIT 10
        `,
        [startOfDay(start), endOfDay(end)]
      ),
      pool.query<RowDataPacket[]>(
        `
          SELECT status, COUNT(*) AS count
          FROM transaksi
          WHERE created_at BETWEEN ? AND ?
          GROUP BY status
          ORDER BY count DESC
        `,
        [startOfDay(start), endOfDay(end)]
      ),
    ]);

    const summary = summaryRows[0][0] ?? {};

    return {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      operationalSummary: {
        pendingDeposits: Number(summary.pending_deposits ?? 0),
        pendingWithdrawals: Number(summary.pending_withdrawals ?? 0),
        verifiedDeposits: Number(summary.verified_deposits ?? 0),
        successfulWithdrawals: Number(summary.successful_withdrawals ?? 0),
      },
      dailyTrend: dailyRows[0].map((row) => ({
        date: row.date ? new Date(row.date).toISOString() : new Date().toISOString(),
        totalSetoranKg: Number(row.total_setoran_kg ?? 0),
        totalSetoranRp: Number(row.total_setoran_rp ?? 0),
        transactionCount: Number(row.transaction_count ?? 0),
      })),
      wasteBreakdown: wasteRows[0].map((row) => ({
        wasteType: String(row.waste_type ?? "Lainnya"),
        totalSetoranKg: Number(row.total_setoran_kg ?? 0),
        totalSetoranRp: Number(row.total_setoran_rp ?? 0),
        transactionCount: Number(row.transaction_count ?? 0),
      })),
      topMembers: memberRows[0].map((row) => ({
        memberId: row.member_id == null ? null : Number(row.member_id),
        memberName: String(row.member_name ?? "Tanpa Nama"),
        totalSetoranKg: Number(row.total_setoran_kg ?? 0),
        totalSetoranRp: Number(row.total_setoran_rp ?? 0),
        transactionCount: Number(row.transaction_count ?? 0),
      })),
      statusBreakdown: statusRows[0].map((row) => ({
        status: formatStatus(String(row.status ?? "-")),
        count: Number(row.count ?? 0),
      })),
    };
  } catch (error) {
    console.error("MySQL analytics query failed:", error);
    return {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      operationalSummary: {
        pendingDeposits: 0,
        pendingWithdrawals: 0,
        verifiedDeposits: 0,
        successfulWithdrawals: 0,
      },
      dailyTrend: [],
      wasteBreakdown: [],
      topMembers: [],
      statusBreakdown: [],
    };
  }
}

export async function getAdminAlerts(): Promise<{ generatedAt: string; items: AdminAlert[] }> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `
        SELECT
          (SELECT COUNT(*) FROM setoran WHERE status = 'pending') AS pending_deposits,
          (SELECT COUNT(*) FROM penarikan WHERE status = 'pending') AS pending_withdrawals,
          (SELECT COUNT(*) FROM users WHERE role = 'nasabah' AND id NOT IN (SELECT DISTINCT user_id FROM transaksi WHERE user_id IS NOT NULL)) AS inactive_members,
          (SELECT COUNT(*) FROM transaksi WHERE DATE(created_at) = CURDATE()) AS transactions_today,
          (SELECT COUNT(*) FROM transaksi WHERE tipe = 'tarik' AND status = 'failed') AS failed_withdrawals
      `
    );

    const row = rows[0] ?? {};
    const alerts: AdminAlert[] = [];

    const pendingDeposits = Number(row.pending_deposits ?? 0);
    if (pendingDeposits > 0) {
      alerts.push({
        id: "pending-deposits",
        level: pendingDeposits >= 10 ? "critical" : "warning",
        category: "deposit",
        title: "Setoran menunggu verifikasi",
        description: `${pendingDeposits} setoran masih menunggu persetujuan admin atau petugas.`,
        count: pendingDeposits,
        actionLabel: "Lihat setoran",
        actionTarget: "/api/deposits?status=pending&page=1&limit=10",
      });
    }

    const pendingWithdrawals = Number(row.pending_withdrawals ?? 0);
    if (pendingWithdrawals > 0) {
      alerts.push({
        id: "pending-withdrawals",
        level: pendingWithdrawals >= 5 ? "critical" : "warning",
        category: "withdrawal",
        title: "Penarikan menunggu proses",
        description: `${pendingWithdrawals} penarikan saldo belum diproses.`,
        count: pendingWithdrawals,
        actionLabel: "Lihat penarikan",
        actionTarget: "/api/withdrawals?status=pending&page=1&limit=10",
      });
    }

    const failedWithdrawals = Number(row.failed_withdrawals ?? 0);
    if (failedWithdrawals > 0) {
      alerts.push({
        id: "failed-withdrawals",
        level: "warning",
        category: "withdrawal",
        title: "Ada penarikan gagal",
        description: `${failedWithdrawals} transaksi penarikan berstatus gagal dan perlu ditinjau ulang.`,
        count: failedWithdrawals,
        actionLabel: "Tinjau transaksi",
        actionTarget: "/api/transactions?tipe=tarik&status=failed&page=1&limit=10",
      });
    }

    const inactiveMembers = Number(row.inactive_members ?? 0);
    if (inactiveMembers > 0) {
      alerts.push({
        id: "inactive-members",
        level: "info",
        category: "member",
        title: "Anggota belum pernah transaksi",
        description: `${inactiveMembers} anggota belum memiliki riwayat transaksi.`,
        count: inactiveMembers,
        actionLabel: "Lihat anggota",
        actionTarget: "/api/members?page=1&limit=10",
      });
    }

    const transactionsToday = Number(row.transactions_today ?? 0);
    if (transactionsToday === 0) {
      alerts.push({
        id: "no-transactions-today",
        level: "info",
        category: "report",
        title: "Belum ada transaksi hari ini",
        description: "Belum ada transaksi masuk hari ini. Cek operasional dan aktivitas anggota.",
        count: 0,
        actionLabel: "Lihat dashboard",
        actionTarget: "/api/dashboard",
      });
    }

    if (alerts.length === 0) {
      alerts.push({
        id: "all-good",
        level: "info",
        category: "system",
        title: "Operasional normal",
        description: "Tidak ada alert prioritas saat ini. Semua antrean utama terlihat aman.",
        count: 0,
        actionLabel: "Lihat ringkasan",
        actionTarget: "/api/admin-summary",
      });
    }

    return {
      generatedAt: new Date().toISOString(),
      items: alerts,
    };
  } catch (error) {
    console.error("MySQL admin alerts query failed:", error);
    return {
      generatedAt: new Date().toISOString(),
      items: [
        {
          id: "alerts-unavailable",
          level: "warning",
          category: "system",
          title: "Alerts tidak tersedia",
          description: "Backend gagal memuat alerts operasional saat ini.",
          count: 0,
          actionLabel: "Refresh",
          actionTarget: "/api/admin-alerts",
        },
      ],
    };
  }
}

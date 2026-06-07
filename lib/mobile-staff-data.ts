import pool from "./db";
import { RowDataPacket } from "mysql2";
import { listAdminAuditLogs } from "./admin-audit";
import { getAdminSummary, getStaffById, listDeposits, listTransactions, listWithdrawals } from "./web-data";

type StaffPerformanceRow = RowDataPacket & {
  total_deposits: number | null;
  total_withdrawals: number | null;
  deposits_today: number | null;
  withdrawals_today: number | null;
};

type StaffActivityItem = {
  id: number;
  entityType: string;
  action: string;
  targetName: string;
  description: string;
  status: string | null;
  createdAt: string;
};

async function getStaffActivity(staffId: number, limit = 10) {
  const result = await listAdminAuditLogs({
    actorId: staffId,
    page: 1,
    limit,
  });

  return result.items
    .filter((item) => item.action === "mobile-status-update")
    .map((item) => ({
      id: item.id,
      entityType: item.entityType,
      action: item.action,
      targetName: item.entityLabel,
      description: item.description,
      status: typeof item.metadata?.payload === "object" && item.metadata?.payload && "status" in item.metadata.payload
        ? String((item.metadata.payload as { status?: string }).status ?? "")
        : null,
      createdAt: item.createdAt,
    })) satisfies StaffActivityItem[];
}

async function getStaffPerformance(staffId: number) {
  const [rows] = await pool.query<StaffPerformanceRow[]>(
    `
      SELECT
        SUM(CASE WHEN entity_type = 'deposit' THEN 1 ELSE 0 END) AS total_deposits,
        SUM(CASE WHEN entity_type = 'withdrawal' THEN 1 ELSE 0 END) AS total_withdrawals,
        SUM(CASE WHEN entity_type = 'deposit' AND DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) AS deposits_today,
        SUM(CASE WHEN entity_type = 'withdrawal' AND DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) AS withdrawals_today
      FROM admin_audit_logs
      WHERE actor_id = ? AND action = 'mobile-status-update'
    `,
    [staffId]
  );

  const row = rows[0] ?? {};

  return {
    handledDepositsToday: Number(row.deposits_today ?? 0),
    handledWithdrawalsToday: Number(row.withdrawals_today ?? 0),
    totalHandledDeposits: Number(row.total_deposits ?? 0),
    totalHandledWithdrawals: Number(row.total_withdrawals ?? 0),
  };
}

export async function getMobileStaffBootstrap(staffId: string) {
  const numericStaffId = Number(staffId);
  const [staff, summary, deposits, withdrawals, transactions, performance, activity] = await Promise.all([
    getStaffById(numericStaffId),
    getAdminSummary(),
    listDeposits({ page: 1, limit: 5 }),
    listWithdrawals({ page: 1, limit: 5 }),
    listTransactions({ page: 1, limit: 5 }),
    getStaffPerformance(numericStaffId),
    getStaffActivity(numericStaffId, 6),
  ]);

  if (!staff) {
    throw new Error("Petugas tidak ditemukan");
  }

  return {
    user: {
      id: String(staff.id),
      nama: staff.nama,
      email: staff.email,
      noHp: staff.noHp,
      role: staff.role,
      alamat: staff.alamat,
    },
    dashboard: {
      queues: {
        pendingDeposits: summary.pendingDeposits,
        pendingWithdrawals: summary.pendingWithdrawals,
        totalMembers: summary.totalMembers,
        totalWasteTypes: summary.totalWasteTypes,
      },
      performance,
    },
    spotlight: {
      recentDeposits: deposits.items,
      recentWithdrawals: withdrawals.items,
      recentTransactions: transactions.items,
    },
    myRecentActivity: activity,
  };
}

export async function getMobileStaffActivity(staffId: string, limit = 20) {
  return {
    items: await getStaffActivity(Number(staffId), limit),
  };
}

import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "./web-session";

export type WebRole = "admin" | "petugas";

export async function requireWebAuth(request: NextRequest) {
  const user = await getAdminSessionFromRequest(request);
  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }

  return {
    user,
    response: null,
  };
}

export async function requireWebRole(request: NextRequest, allowedRoles: WebRole[]) {
  const auth = await requireWebAuth(request);
  if (auth.response) {
    return auth;
  }

  if (!auth.user || !allowedRoles.includes(auth.user.role)) {
    return {
      user: auth.user,
      response: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
    };
  }

  return auth;
}

export function getRolePermissions(role: WebRole) {
  const isAdmin = role === "admin";

  return {
    role,
    canViewDashboard: true,
    canViewReports: true,
    canViewAnalytics: true,
    canViewTransactions: true,
    canViewMembers: true,
    canManageMembers: isAdmin,
    canViewWasteTypes: true,
    canManageWasteTypes: isAdmin,
    canCreateDeposits: true,
    canApproveDeposits: true,
    canDeleteDeposits: isAdmin,
    canBulkApproveDeposits: true,
    canCreateWithdrawals: true,
    canApproveWithdrawals: true,
    canDeleteWithdrawals: isAdmin,
    canBulkApproveWithdrawals: true,
    canViewAuditLog: isAdmin,
    canViewAlerts: true,
    canViewSummary: true,
  };
}

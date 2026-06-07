import { NextRequest, NextResponse } from "next/server";
import { writeAdminAuditLog } from "../../../../../lib/admin-audit";
import { requireMobileStaffSession } from "../../../../../lib/mobile-staff-auth";
import { createWithdrawal, getStaffById, listWithdrawals, updateWithdrawalStatus } from "../../../../../lib/web-data";

export async function GET(request: NextRequest) {
  const staffId = await requireMobileStaffSession(request);
  if (!staffId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const status = request.nextUrl.searchParams.get("status") ?? undefined;
  const q = request.nextUrl.searchParams.get("q") ?? undefined;
  const userIdParam = request.nextUrl.searchParams.get("userId");
  const userId = userIdParam ? Number(userIdParam) : undefined;
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "10");

  const result = await listWithdrawals({
    status,
    q,
    userId: Number.isFinite(userId) ? userId : undefined,
    page,
    limit,
  });

  return NextResponse.json(result);
}

export async function PATCH(request: NextRequest) {
  const staffId = await requireMobileStaffSession(request);
  if (!staffId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { withdrawalId, status } = await request.json();
    if (!Number.isFinite(Number(withdrawalId)) || !status) {
      return NextResponse.json({ message: "withdrawalId dan status wajib diisi" }, { status: 400 });
    }

    const staff = await getStaffById(Number(staffId));
    const item = await updateWithdrawalStatus({
      withdrawalId: Number(withdrawalId),
      status,
    });

    await writeAdminAuditLog({
      actorId: Number(staffId),
      actorName: staff?.nama,
      actorRole: staff?.role,
      action: "mobile-status-update",
      entityType: "withdrawal",
      entityId: Number(withdrawalId),
      entityLabel: item?.nasabahNama ?? `Penarikan ${withdrawalId}`,
      description: `Petugas mobile mengubah status penarikan menjadi ${status}`,
      metadata: { source: "mobile-staff", after: item, payload: { withdrawalId: Number(withdrawalId), status } },
    });

    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengubah status penarikan";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const staffId = await requireMobileStaffSession(request);
  if (!staffId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { userId, jumlah, status } = await request.json();
    if (!Number.isFinite(Number(userId)) || !Number.isFinite(Number(jumlah))) {
      return NextResponse.json({ message: "userId dan jumlah wajib valid" }, { status: 400 });
    }

    const staff = await getStaffById(Number(staffId));
    const item = await createWithdrawal({
      userId: Number(userId),
      jumlah: Number(jumlah),
      status,
    });

    await writeAdminAuditLog({
      actorId: Number(staffId),
      actorName: staff?.nama,
      actorRole: staff?.role,
      action: "mobile-create",
      entityType: "withdrawal",
      entityId: item?.id ?? "unknown",
      entityLabel: item?.nasabahNama ?? `Nasabah ${userId}`,
      description: `Petugas mobile membuat penarikan untuk ${item?.nasabahNama ?? userId}`,
      metadata: { source: "mobile-staff", payload: { userId: Number(userId), jumlah: Number(jumlah), status }, after: item },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat penarikan";
    return NextResponse.json({ message }, { status: 400 });
  }
}

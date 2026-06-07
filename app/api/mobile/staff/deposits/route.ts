import { NextRequest, NextResponse } from "next/server";
import { writeAdminAuditLog } from "../../../../../lib/admin-audit";
import { requireMobileStaffSession } from "../../../../../lib/mobile-staff-auth";
import { createDeposit, getStaffById, listDeposits, updateDepositStatus } from "../../../../../lib/web-data";

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

  const result = await listDeposits({
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
    const { depositId, status } = await request.json();
    if (!Number.isFinite(Number(depositId)) || !status) {
      return NextResponse.json({ message: "depositId dan status wajib diisi" }, { status: 400 });
    }

    const staff = await getStaffById(Number(staffId));
    const item = await updateDepositStatus({
      depositId: Number(depositId),
      status,
      petugasId: Number(staffId),
    });

    await writeAdminAuditLog({
      actorId: Number(staffId),
      actorName: staff?.nama,
      actorRole: staff?.role,
      action: "mobile-status-update",
      entityType: "deposit",
      entityId: Number(depositId),
      entityLabel: item?.nasabahNama ?? `Setoran ${depositId}`,
      description: `Petugas mobile mengubah status setoran menjadi ${status}`,
      metadata: { source: "mobile-staff", after: item, payload: { depositId: Number(depositId), status } },
    });

    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengubah status setoran";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const staffId = await requireMobileStaffSession(request);
  if (!staffId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { userId, jenisSampahId, berat, status } = await request.json();
    if (!Number.isFinite(Number(userId)) || !Number.isFinite(Number(jenisSampahId)) || !Number.isFinite(Number(berat))) {
      return NextResponse.json({ message: "userId, jenisSampahId, dan berat wajib valid" }, { status: 400 });
    }

    const staff = await getStaffById(Number(staffId));
    const item = await createDeposit({
      userId: Number(userId),
      jenisSampahId: Number(jenisSampahId),
      berat: Number(berat),
      status,
      petugasId: Number(staffId),
    });

    await writeAdminAuditLog({
      actorId: Number(staffId),
      actorName: staff?.nama,
      actorRole: staff?.role,
      action: "mobile-create",
      entityType: "deposit",
      entityId: item?.id ?? "unknown",
      entityLabel: item?.nasabahNama ?? `Nasabah ${userId}`,
      description: `Petugas mobile membuat setoran untuk ${item?.nasabahNama ?? userId}`,
      metadata: { source: "mobile-staff", payload: { userId: Number(userId), jenisSampahId: Number(jenisSampahId), berat: Number(berat), status }, after: item },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat setoran";
    return NextResponse.json({ message }, { status: 400 });
  }
}

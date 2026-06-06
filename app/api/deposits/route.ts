import { NextRequest, NextResponse } from "next/server";
import { requireWebAuth } from "../../../lib/route-auth";
import { createDeposit, listDeposits, updateDepositStatus } from "../../../lib/web-data";
import { writeAdminAuditLog } from "../../../lib/admin-audit";

export async function GET(request: NextRequest) {
  const auth = await requireWebAuth(request);
  if (auth.response) {
    return auth.response;
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

export async function POST(request: NextRequest) {
  const auth = await requireWebAuth(request);
  if (auth.response) {
    return auth.response;
  }

  try {
    const { userId, jenisSampahId, berat, status } = await request.json();
    if (!Number.isFinite(Number(userId)) || !Number.isFinite(Number(jenisSampahId)) || !Number.isFinite(Number(berat))) {
      return NextResponse.json({ message: "userId, jenisSampahId, dan berat wajib valid" }, { status: 400 });
    }

    const item = await createDeposit({
      userId: Number(userId),
      jenisSampahId: Number(jenisSampahId),
      berat: Number(berat),
      status,
      petugasId: auth.user?.id ?? null,
    });
    await writeAdminAuditLog({
      actorId: auth.user?.id,
      actorName: auth.user?.nama,
      actorRole: auth.user?.role,
      action: "create",
      entityType: "deposit",
      entityId: item?.id ?? "unknown",
      entityLabel: item?.nasabahNama ?? `Nasabah ${userId}`,
      description: `Membuat setoran untuk ${item?.nasabahNama ?? userId}`,
      metadata: { userId: Number(userId), jenisSampahId: Number(jenisSampahId), berat: Number(berat), status },
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat setoran";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireWebAuth(request);
  if (auth.response) {
    return auth.response;
  }

  try {
    const { depositId, status } = await request.json();
    if (!Number.isFinite(Number(depositId)) || !status) {
      return NextResponse.json({ message: "depositId dan status wajib diisi" }, { status: 400 });
    }

    const before = await listDeposits({ page: 1, limit: 1, q: undefined });
    const item = await updateDepositStatus({
      depositId: Number(depositId),
      status,
      petugasId: auth.user?.id ?? null,
    });
    await writeAdminAuditLog({
      actorId: auth.user?.id,
      actorName: auth.user?.nama,
      actorRole: auth.user?.role,
      action: "status-update",
      entityType: "deposit",
      entityId: Number(depositId),
      entityLabel: item?.nasabahNama ?? `Setoran ${depositId}`,
      description: `Mengubah status setoran menjadi ${status}`,
      metadata: { after: item, payload: { depositId: Number(depositId), status }, beforeSummaryCount: before.meta.totalItems },
    });
    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengubah status setoran";
    return NextResponse.json({ message }, { status: 400 });
  }
}

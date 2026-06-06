import { NextRequest, NextResponse } from "next/server";
import { requireWebAuth } from "../../../lib/route-auth";
import { createWithdrawal, listWithdrawals, updateWithdrawalStatus } from "../../../lib/web-data";
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
  const result = await listWithdrawals({
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
    const { userId, jumlah, status } = await request.json();
    if (!Number.isFinite(Number(userId)) || !Number.isFinite(Number(jumlah))) {
      return NextResponse.json({ message: "userId dan jumlah wajib valid" }, { status: 400 });
    }

    const item = await createWithdrawal({
      userId: Number(userId),
      jumlah: Number(jumlah),
      status,
    });
    await writeAdminAuditLog({
      actorId: auth.user?.id,
      actorName: auth.user?.nama,
      actorRole: auth.user?.role,
      action: "create",
      entityType: "withdrawal",
      entityId: item?.id ?? "unknown",
      entityLabel: item?.nasabahNama ?? `Nasabah ${userId}`,
      description: `Membuat penarikan untuk ${item?.nasabahNama ?? userId}`,
      metadata: { userId: Number(userId), jumlah: Number(jumlah), status },
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat penarikan";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireWebAuth(request);
  if (auth.response) {
    return auth.response;
  }

  try {
    const { withdrawalId, status } = await request.json();
    if (!Number.isFinite(Number(withdrawalId)) || !status) {
      return NextResponse.json({ message: "withdrawalId dan status wajib diisi" }, { status: 400 });
    }

    const item = await updateWithdrawalStatus({
      withdrawalId: Number(withdrawalId),
      status,
    });
    await writeAdminAuditLog({
      actorId: auth.user?.id,
      actorName: auth.user?.nama,
      actorRole: auth.user?.role,
      action: "status-update",
      entityType: "withdrawal",
      entityId: Number(withdrawalId),
      entityLabel: item?.nasabahNama ?? `Penarikan ${withdrawalId}`,
      description: `Mengubah status penarikan menjadi ${status}`,
      metadata: { after: item, payload: { withdrawalId: Number(withdrawalId), status } },
    });
    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengubah status penarikan";
    return NextResponse.json({ message }, { status: 400 });
  }
}

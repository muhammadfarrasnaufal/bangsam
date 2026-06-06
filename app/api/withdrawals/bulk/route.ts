import { NextRequest, NextResponse } from "next/server";
import { writeAdminAuditLog } from "../../../../lib/admin-audit";
import { requireWebAuth } from "../../../../lib/route-auth";
import { bulkUpdateWithdrawalStatus } from "../../../../lib/web-data";

export async function PATCH(request: NextRequest) {
  const auth = await requireWebAuth(request);
  if (auth.response) {
    return auth.response;
  }

  try {
    const { withdrawalIds, status } = await request.json();
    if (!Array.isArray(withdrawalIds) || withdrawalIds.length === 0 || !status) {
      return NextResponse.json({ message: "withdrawalIds dan status wajib diisi" }, { status: 400 });
    }

    const normalizedIds = withdrawalIds
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));

    if (normalizedIds.length === 0) {
      return NextResponse.json({ message: "withdrawalIds tidak valid" }, { status: 400 });
    }

    const result = await bulkUpdateWithdrawalStatus({
      withdrawalIds: normalizedIds,
      status,
    });

    await writeAdminAuditLog({
      actorId: auth.user?.id,
      actorName: auth.user?.nama,
      actorRole: auth.user?.role,
      action: "bulk-status-update",
      entityType: "withdrawal",
      entityId: normalizedIds.join(","),
      entityLabel: `Bulk ${normalizedIds.length} penarikan`,
      description: `Mengubah status ${result.updatedCount}/${result.requestedCount} penarikan menjadi ${status}`,
      metadata: {
        withdrawalIds: normalizedIds,
        status,
        updatedCount: result.updatedCount,
        skippedIds: result.skippedIds,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memproses bulk penarikan";
    return NextResponse.json({ message }, { status: 400 });
  }
}

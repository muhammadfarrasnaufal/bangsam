import { NextRequest, NextResponse } from "next/server";
import { writeAdminAuditLog } from "../../../../lib/admin-audit";
import { requireWebAuth } from "../../../../lib/route-auth";
import { bulkUpdateDepositStatus } from "../../../../lib/web-data";

export async function PATCH(request: NextRequest) {
  const auth = await requireWebAuth(request);
  if (auth.response) {
    return auth.response;
  }

  try {
    const { depositIds, status } = await request.json();
    if (!Array.isArray(depositIds) || depositIds.length === 0 || !status) {
      return NextResponse.json({ message: "depositIds dan status wajib diisi" }, { status: 400 });
    }

    const normalizedIds = depositIds
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));

    if (normalizedIds.length === 0) {
      return NextResponse.json({ message: "depositIds tidak valid" }, { status: 400 });
    }

    const result = await bulkUpdateDepositStatus({
      depositIds: normalizedIds,
      status,
      petugasId: auth.user?.id ?? null,
    });

    await writeAdminAuditLog({
      actorId: auth.user?.id,
      actorName: auth.user?.nama,
      actorRole: auth.user?.role,
      action: "bulk-status-update",
      entityType: "deposit",
      entityId: normalizedIds.join(","),
      entityLabel: `Bulk ${normalizedIds.length} setoran`,
      description: `Mengubah status ${result.updatedCount}/${result.requestedCount} setoran menjadi ${status}`,
      metadata: {
        depositIds: normalizedIds,
        status,
        updatedCount: result.updatedCount,
        skippedIds: result.skippedIds,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memproses bulk setoran";
    return NextResponse.json({ message }, { status: 400 });
  }
}

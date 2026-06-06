import { NextRequest, NextResponse } from "next/server";
import { requireWebAuth, requireWebRole } from "../../../../lib/route-auth";
import { deleteDeposit, getDepositById } from "../../../../lib/web-data";
import { writeAdminAuditLog } from "../../../../lib/admin-audit";

function parseId(value: string) {
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireWebAuth(request);
  if (auth.response) {
    return auth.response;
  }

  const { id } = await context.params;
  const depositId = parseId(id);
  if (!depositId) {
    return NextResponse.json({ message: "ID setoran tidak valid" }, { status: 400 });
  }

  const item = await getDepositById(depositId);
  if (!item) {
    return NextResponse.json({ message: "Setoran tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ item });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireWebRole(request, ["admin"]);
  if (auth.response) {
    return auth.response;
  }

  const { id } = await context.params;
  const depositId = parseId(id);
  if (!depositId) {
    return NextResponse.json({ message: "ID setoran tidak valid" }, { status: 400 });
  }

  try {
    const before = await getDepositById(depositId);
    const result = await deleteDeposit(depositId);
    await writeAdminAuditLog({
      actorId: auth.user?.id,
      actorName: auth.user?.nama,
      actorRole: auth.user?.role,
      action: "delete",
      entityType: "deposit",
      entityId: depositId,
      entityLabel: before?.nasabahNama ?? "Setoran",
      description: `Menghapus setoran ${before?.nasabahNama ?? depositId}`,
      metadata: { before },
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghapus setoran";
    return NextResponse.json({ message }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireWebRole } from "../../../../lib/route-auth";
import { deleteStaff, getStaffById, updateStaff } from "../../../../lib/web-data";
import { writeAdminAuditLog } from "../../../../lib/admin-audit";

function parseId(value: string) {
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireWebRole(request, ["admin"]);
  if (auth.response) {
    return auth.response;
  }

  const { id } = await context.params;
  const staffId = parseId(id);
  if (!staffId) {
    return NextResponse.json({ message: "ID petugas tidak valid" }, { status: 400 });
  }

  const item = await getStaffById(staffId);
  if (!item) {
    return NextResponse.json({ message: "Petugas tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ item });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireWebRole(request, ["admin"]);
  if (auth.response) {
    return auth.response;
  }

  const { id } = await context.params;
  const staffId = parseId(id);
  if (!staffId) {
    return NextResponse.json({ message: "ID petugas tidak valid" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const before = await getStaffById(staffId);
    const item = await updateStaff(staffId, body);
    await writeAdminAuditLog({
      actorId: auth.user?.id,
      actorName: auth.user?.nama,
      actorRole: auth.user?.role,
      action: "update",
      entityType: "staff",
      entityId: staffId,
      entityLabel: item?.nama ?? before?.nama ?? "Petugas",
      description: `Mengubah data petugas ${item?.nama ?? before?.nama ?? staffId}`,
      metadata: { before, after: item, payload: body },
    });
    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengubah petugas";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireWebRole(request, ["admin"]);
  if (auth.response) {
    return auth.response;
  }

  const { id } = await context.params;
  const staffId = parseId(id);
  if (!staffId) {
    return NextResponse.json({ message: "ID petugas tidak valid" }, { status: 400 });
  }

  try {
    const before = await getStaffById(staffId);
    const result = await deleteStaff(staffId);
    await writeAdminAuditLog({
      actorId: auth.user?.id,
      actorName: auth.user?.nama,
      actorRole: auth.user?.role,
      action: "delete",
      entityType: "staff",
      entityId: staffId,
      entityLabel: before?.nama ?? "Petugas",
      description: `Menghapus petugas ${before?.nama ?? staffId}`,
      metadata: { before },
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghapus petugas";
    return NextResponse.json({ message }, { status: 400 });
  }
}

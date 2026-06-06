import { NextRequest, NextResponse } from "next/server";
import { requireWebAuth, requireWebRole } from "../../../../lib/route-auth";
import { deleteWasteType, getWasteTypeById, updateWasteType } from "../../../../lib/web-data";
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
  const wasteTypeId = parseId(id);
  if (!wasteTypeId) {
    return NextResponse.json({ message: "ID jenis sampah tidak valid" }, { status: 400 });
  }

  const item = await getWasteTypeById(wasteTypeId);
  if (!item) {
    return NextResponse.json({ message: "Jenis sampah tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ item });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireWebRole(request, ["admin"]);
  if (auth.response) {
    return auth.response;
  }

  const { id } = await context.params;
  const wasteTypeId = parseId(id);
  if (!wasteTypeId) {
    return NextResponse.json({ message: "ID jenis sampah tidak valid" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const before = await getWasteTypeById(wasteTypeId);
    const item = await updateWasteType(wasteTypeId, body);
    await writeAdminAuditLog({
      actorId: auth.user?.id,
      actorName: auth.user?.nama,
      actorRole: auth.user?.role,
      action: "update",
      entityType: "waste-type",
      entityId: wasteTypeId,
      entityLabel: item?.namaSampah ?? before?.namaSampah ?? "Jenis Sampah",
      description: `Mengubah jenis sampah ${item?.namaSampah ?? before?.namaSampah ?? wasteTypeId}`,
      metadata: { before, after: item, payload: body },
    });
    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengubah jenis sampah";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireWebRole(request, ["admin"]);
  if (auth.response) {
    return auth.response;
  }

  const { id } = await context.params;
  const wasteTypeId = parseId(id);
  if (!wasteTypeId) {
    return NextResponse.json({ message: "ID jenis sampah tidak valid" }, { status: 400 });
  }

  try {
    const before = await getWasteTypeById(wasteTypeId);
    const result = await deleteWasteType(wasteTypeId);
    await writeAdminAuditLog({
      actorId: auth.user?.id,
      actorName: auth.user?.nama,
      actorRole: auth.user?.role,
      action: "delete",
      entityType: "waste-type",
      entityId: wasteTypeId,
      entityLabel: before?.namaSampah ?? "Jenis Sampah",
      description: `Menghapus jenis sampah ${before?.namaSampah ?? wasteTypeId}`,
      metadata: { before },
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghapus jenis sampah";
    return NextResponse.json({ message }, { status: 400 });
  }
}

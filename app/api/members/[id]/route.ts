import { NextRequest, NextResponse } from "next/server";
import { requireWebAuth, requireWebRole } from "../../../../lib/route-auth";
import { deleteMember, getMemberById, updateMember } from "../../../../lib/web-data";
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
  const memberId = parseId(id);
  if (!memberId) {
    return NextResponse.json({ message: "ID anggota tidak valid" }, { status: 400 });
  }

  const item = await getMemberById(memberId);
  if (!item) {
    return NextResponse.json({ message: "Anggota tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ item });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireWebRole(request, ["admin"]);
  if (auth.response) {
    return auth.response;
  }

  const { id } = await context.params;
  const memberId = parseId(id);
  if (!memberId) {
    return NextResponse.json({ message: "ID anggota tidak valid" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const before = await getMemberById(memberId);
    const item = await updateMember(memberId, body);
    await writeAdminAuditLog({
      actorId: auth.user?.id,
      actorName: auth.user?.nama,
      actorRole: auth.user?.role,
      action: "update",
      entityType: "member",
      entityId: memberId,
      entityLabel: item?.nama ?? before?.nama ?? "Anggota",
      description: `Mengubah data anggota ${item?.nama ?? before?.nama ?? memberId}`,
      metadata: { before, after: item, payload: body },
    });
    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengubah anggota";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireWebRole(request, ["admin"]);
  if (auth.response) {
    return auth.response;
  }

  const { id } = await context.params;
  const memberId = parseId(id);
  if (!memberId) {
    return NextResponse.json({ message: "ID anggota tidak valid" }, { status: 400 });
  }

  try {
    const before = await getMemberById(memberId);
    const result = await deleteMember(memberId);
    await writeAdminAuditLog({
      actorId: auth.user?.id,
      actorName: auth.user?.nama,
      actorRole: auth.user?.role,
      action: "delete",
      entityType: "member",
      entityId: memberId,
      entityLabel: before?.nama ?? "Anggota",
      description: `Menghapus anggota ${before?.nama ?? memberId}`,
      metadata: { before },
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghapus anggota";
    return NextResponse.json({ message }, { status: 400 });
  }
}

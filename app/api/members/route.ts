import { NextRequest, NextResponse } from "next/server";
import { requireWebAuth, requireWebRole } from "../../../lib/route-auth";
import { createMember, listMembers } from "../../../lib/web-data";
import { writeAdminAuditLog } from "../../../lib/admin-audit";

export async function GET(request: NextRequest) {
  const auth = await requireWebAuth(request);
  if (auth.response) {
    return auth.response;
  }

  const q = request.nextUrl.searchParams.get("q") ?? undefined;
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "10");
  const result = await listMembers({ q, page, limit });
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const auth = await requireWebRole(request, ["admin"]);
  if (auth.response) {
    return auth.response;
  }

  try {
    const { nama, email, password, alamat, noHp } = await request.json();
    if (!nama || !email || !password) {
      return NextResponse.json({ message: "nama, email, dan password wajib diisi" }, { status: 400 });
    }

    const member = await createMember({ nama, email, password, alamat, noHp });
    await writeAdminAuditLog({
      actorId: auth.user?.id,
      actorName: auth.user?.nama,
      actorRole: auth.user?.role,
      action: "create",
      entityType: "member",
      entityId: member?.id ?? "unknown",
      entityLabel: member?.nama ?? nama,
      description: `Membuat anggota baru ${member?.nama ?? nama}`,
      metadata: { email, alamat, noHp },
    });
    return NextResponse.json({ item: member }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat anggota";
    return NextResponse.json({ message }, { status: 400 });
  }
}

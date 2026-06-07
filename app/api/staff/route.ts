import { NextRequest, NextResponse } from "next/server";
import { requireWebRole } from "../../../lib/route-auth";
import { createStaff, listStaff } from "../../../lib/web-data";
import { writeAdminAuditLog } from "../../../lib/admin-audit";

export async function GET(request: NextRequest) {
  const auth = await requireWebRole(request, ["admin"]);
  if (auth.response) {
    return auth.response;
  }

  const q = request.nextUrl.searchParams.get("q") ?? undefined;
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "10");
  const result = await listStaff({ q, page, limit });
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

    const staff = await createStaff({ nama, email, password, alamat, noHp });
    await writeAdminAuditLog({
      actorId: auth.user?.id,
      actorName: auth.user?.nama,
      actorRole: auth.user?.role,
      action: "create",
      entityType: "staff",
      entityId: staff?.id ?? "unknown",
      entityLabel: staff?.nama ?? nama,
      description: `Membuat akun petugas ${staff?.nama ?? nama}`,
      metadata: { email, alamat, noHp, role: "petugas" },
    });
    return NextResponse.json({ item: staff }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat petugas";
    return NextResponse.json({ message }, { status: 400 });
  }
}

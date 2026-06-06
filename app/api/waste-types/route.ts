import { NextRequest, NextResponse } from "next/server";
import { requireWebAuth, requireWebRole } from "../../../lib/route-auth";
import { createWasteType, listWasteTypes } from "../../../lib/web-data";
import { writeAdminAuditLog } from "../../../lib/admin-audit";

export async function GET(request: NextRequest) {
  const auth = await requireWebAuth(request);
  if (auth.response) {
    return auth.response;
  }

  const q = request.nextUrl.searchParams.get("q") ?? undefined;
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "10");
  const result = await listWasteTypes({ q, page, limit });
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const auth = await requireWebRole(request, ["admin"]);
  if (auth.response) {
    return auth.response;
  }

  try {
    const { namaSampah, hargaPerkg, barcode } = await request.json();
    if (!namaSampah || !Number.isFinite(Number(hargaPerkg))) {
      return NextResponse.json({ message: "namaSampah dan hargaPerkg wajib valid" }, { status: 400 });
    }

    const item = await createWasteType({
      namaSampah,
      hargaPerkg: Number(hargaPerkg),
      barcode,
    });
    await writeAdminAuditLog({
      actorId: auth.user?.id,
      actorName: auth.user?.nama,
      actorRole: auth.user?.role,
      action: "create",
      entityType: "waste-type",
      entityId: item?.id ?? "unknown",
      entityLabel: item?.namaSampah ?? namaSampah,
      description: `Menambahkan jenis sampah ${item?.namaSampah ?? namaSampah}`,
      metadata: { hargaPerkg: Number(hargaPerkg), barcode },
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat jenis sampah";
    return NextResponse.json({ message }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { writeAdminAuditLog } from "../../../../lib/admin-audit";
import { verifyMemberByCode } from "../../../../lib/member-verification";
import { requireWebAuth } from "../../../../lib/route-auth";

export async function POST(request: NextRequest) {
  const auth = await requireWebAuth(request);
  if (auth.response) {
    return auth.response;
  }

  try {
    const { code, qrPayload } = await request.json();
    const result = await verifyMemberByCode({
      staffId: Number(auth.user?.id),
      code,
      qrPayload,
    });

    await writeAdminAuditLog({
      actorId: auth.user?.id,
      actorName: auth.user?.nama,
      actorRole: auth.user?.role,
      action: "web-verify-member",
      entityType: "member",
      entityId: result?.member.id ?? "unknown",
      entityLabel: result?.member.nama ?? "Nasabah",
      description: `Verifikasi nasabah via web ${result?.member.nama ?? ""}`.trim(),
      metadata: { source: "web", code: result?.verification.code, verification: result?.verification },
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memverifikasi nasabah";
    return NextResponse.json({ message }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { writeAdminAuditLog } from "../../../../../../lib/admin-audit";
import { verifyMemberByCode } from "../../../../../../lib/member-verification";
import { requireMobileStaffSession } from "../../../../../../lib/mobile-staff-auth";
import { getStaffById } from "../../../../../../lib/web-data";

export async function POST(request: NextRequest) {
  const staffId = await requireMobileStaffSession(request);
  if (!staffId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { code, qrPayload } = await request.json();
    const staff = await getStaffById(Number(staffId));
    const result = await verifyMemberByCode({
      staffId: Number(staffId),
      code,
      qrPayload,
    });

    await writeAdminAuditLog({
      actorId: Number(staffId),
      actorName: staff?.nama,
      actorRole: staff?.role,
      action: "mobile-verify-member",
      entityType: "member",
      entityId: result?.member.id ?? "unknown",
      entityLabel: result?.member.nama ?? "Nasabah",
      description: `Petugas mobile memverifikasi nasabah ${result?.member.nama ?? ""}`.trim(),
      metadata: { source: "mobile-staff", code: result?.verification.code, verification: result?.verification },
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memverifikasi nasabah";
    return NextResponse.json({ message }, { status: 400 });
  }
}

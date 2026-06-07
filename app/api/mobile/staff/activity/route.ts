import { NextRequest, NextResponse } from "next/server";
import { requireMobileStaffSession } from "../../../../../lib/mobile-staff-auth";
import { getMobileStaffActivity } from "../../../../../lib/mobile-staff-data";

export async function GET(request: NextRequest) {
  const staffId = await requireMobileStaffSession(request);
  if (!staffId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? "20");
    const data = await getMobileStaffActivity(staffId, Number.isFinite(limit) ? limit : 20);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memuat aktivitas petugas";
    return NextResponse.json({ message }, { status: 400 });
  }
}

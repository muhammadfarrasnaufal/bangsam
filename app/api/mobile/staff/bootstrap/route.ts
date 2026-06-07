import { NextRequest, NextResponse } from "next/server";
import { requireMobileStaffSession } from "../../../../../lib/mobile-staff-auth";
import { getMobileStaffBootstrap } from "../../../../../lib/mobile-staff-data";

export async function GET(request: NextRequest) {
  const staffId = await requireMobileStaffSession(request);
  if (!staffId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await getMobileStaffBootstrap(staffId);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memuat bootstrap petugas";
    return NextResponse.json({ message }, { status: 400 });
  }
}

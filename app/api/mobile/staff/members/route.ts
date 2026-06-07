import { NextRequest, NextResponse } from "next/server";
import { requireMobileStaffSession } from "../../../../../lib/mobile-staff-auth";
import { listVerifiableMembers } from "../../../../../lib/member-verification";

export async function GET(request: NextRequest) {
  const staffId = await requireMobileStaffSession(request);
  if (!staffId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q") ?? undefined;
  const status = request.nextUrl.searchParams.get("status") ?? undefined;
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "10");

  const result = await listVerifiableMembers({ q, status, page, limit });
  return NextResponse.json(result);
}

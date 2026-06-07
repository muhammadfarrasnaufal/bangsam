import { NextRequest, NextResponse } from "next/server";
import { getMemberVerificationStatus } from "../../../../../lib/member-verification";
import { requireMobileStaffSession } from "../../../../../lib/mobile-staff-auth";
import { listMembers } from "../../../../../lib/web-data";

export async function GET(request: NextRequest) {
  const staffId = await requireMobileStaffSession(request);
  if (!staffId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q") ?? undefined;
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "10");

  const result = await listMembers({ q, page, limit });
  const items = await Promise.all(
    result.items.map(async (member) => {
      const verification = await getMemberVerificationStatus(member.id);
      return {
        ...member,
        verification: verification?.verification ?? null,
      };
    })
  );

  return NextResponse.json({
    items,
    meta: result.meta,
  });
}

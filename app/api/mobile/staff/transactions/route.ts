import { NextRequest, NextResponse } from "next/server";
import { requireMobileStaffSession } from "../../../../../lib/mobile-staff-auth";
import { listTransactions } from "../../../../../lib/web-data";

export async function GET(request: NextRequest) {
  const staffId = await requireMobileStaffSession(request);
  if (!staffId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tipe = request.nextUrl.searchParams.get("tipe") ?? undefined;
  const status = request.nextUrl.searchParams.get("status") ?? undefined;
  const q = request.nextUrl.searchParams.get("q") ?? undefined;
  const userIdParam = request.nextUrl.searchParams.get("userId");
  const userId = userIdParam ? Number(userIdParam) : undefined;
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "10");

  const result = await listTransactions({
    tipe,
    status,
    q,
    userId: Number.isFinite(userId) ? userId : undefined,
    page,
    limit,
  });

  return NextResponse.json(result);
}

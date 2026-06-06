import { NextRequest, NextResponse } from "next/server";
import { requireMobileSession } from "../../../../lib/mobile-auth";
import { getMobileHistory } from "../../../../lib/mobile-data";

export async function GET(request: NextRequest) {
  const memberId = await requireMobileSession(request);
  if (!memberId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const filter = (request.nextUrl.searchParams.get("filter") ?? "semua") as
    | "semua"
    | "setoran"
    | "penarikan"
    | "reward";

  const data = await getMobileHistory(memberId, filter);
  return NextResponse.json(data);
}

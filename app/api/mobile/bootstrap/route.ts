import { NextRequest, NextResponse } from "next/server";
import { requireMobileSession } from "../../../../lib/mobile-auth";
import { getMobileBootstrap } from "../../../../lib/mobile-data";

export async function GET(request: NextRequest) {
  const memberId = await requireMobileSession(request);
  if (!memberId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const data = await getMobileBootstrap(memberId);
  return NextResponse.json(data);
}

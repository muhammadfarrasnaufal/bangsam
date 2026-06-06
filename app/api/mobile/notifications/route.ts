import { NextRequest, NextResponse } from "next/server";
import { requireMobileSession } from "../../../../lib/mobile-auth";
import { getMobileNotifications, markNotificationsRead } from "../../../../lib/mobile-data";

export async function GET(request: NextRequest) {
  const memberId = await requireMobileSession(request);
  if (!memberId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const data = await getMobileNotifications(memberId);
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const memberId = await requireMobileSession(request);
  if (!memberId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { action } = await request.json();
  if (action === "mark-read") {
    const data = await markNotificationsRead(memberId);
    return NextResponse.json(data);
  }

  return NextResponse.json({ message: "Action tidak dikenali" }, { status: 400 });
}

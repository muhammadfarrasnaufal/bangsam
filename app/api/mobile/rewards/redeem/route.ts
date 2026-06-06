import { NextRequest, NextResponse } from "next/server";
import { requireMobileSession } from "../../../../../lib/mobile-auth";
import { redeemReward } from "../../../../../lib/mobile-data";

export async function POST(request: NextRequest) {
  const memberId = await requireMobileSession(request);
  if (!memberId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { rewardId } = await request.json();
    const data = await redeemReward(memberId, { rewardId });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menukar reward";
    return NextResponse.json({ message }, { status: 400 });
  }
}

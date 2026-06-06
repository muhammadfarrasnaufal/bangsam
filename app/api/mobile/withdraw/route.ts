import { NextRequest, NextResponse } from "next/server";
import { requireMobileSession } from "../../../../lib/mobile-auth";
import { requestWithdrawal } from "../../../../lib/mobile-data";

export async function POST(request: NextRequest) {
  const memberId = await requireMobileSession(request);
  if (!memberId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { amount, method, accountNumber } = await request.json();
    const data = await requestWithdrawal(memberId, {
      amount: Number(amount),
      method,
      accountNumber,
    });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengirim penarikan";
    return NextResponse.json({ message }, { status: 400 });
  }
}

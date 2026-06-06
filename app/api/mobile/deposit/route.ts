import { NextRequest, NextResponse } from "next/server";
import { requireMobileSession } from "../../../../lib/mobile-auth";
import { submitDeposit } from "../../../../lib/mobile-data";

export async function POST(request: NextRequest) {
  const memberId = await requireMobileSession(request);
  if (!memberId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { wasteTypeId, weightKg } = await request.json();
    const data = await submitDeposit(memberId, {
      wasteTypeId,
      weightKg: Number(weightKg),
    });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan setoran";
    return NextResponse.json({ message }, { status: 400 });
  }
}

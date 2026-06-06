import { NextRequest, NextResponse } from "next/server";
import { requireWebAuth } from "../../../lib/route-auth";
import { getAnalyticsState } from "../../../lib/data";

function formatDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const auth = await requireWebAuth(request);
  if (auth.response) {
    return auth.response;
  }

  const today = new Date();
  const defaultStart = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);

  const start = request.nextUrl.searchParams.get("start") ?? formatDateInput(defaultStart);
  const end = request.nextUrl.searchParams.get("end") ?? formatDateInput(today);

  try {
    const data = await getAnalyticsState(start, end);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memuat analytics";
    return NextResponse.json({ message }, { status: 400 });
  }
}

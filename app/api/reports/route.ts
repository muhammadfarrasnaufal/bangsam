import { NextRequest, NextResponse } from "next/server";
import { getReportState } from "../../../lib/data";
import { requireWebAuth } from "../../../lib/route-auth";

export async function GET(request: NextRequest) {
  const auth = await requireWebAuth(request);
  if (auth.response) {
    return auth.response;
  }

  const url = new URL(request.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json({ error: "start and end query parameters are required" }, { status: 400 });
  }

  try {
    const data = await getReportState(start, end);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to load report data" }, { status: 500 });
  }
}

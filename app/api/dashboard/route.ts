import { NextRequest, NextResponse } from "next/server";
import { getDashboardState } from "../../../lib/data";
import { requireWebAuth } from "../../../lib/route-auth";

export async function GET(request: NextRequest) {
  const auth = await requireWebAuth(request);
  if (auth.response) {
    return auth.response;
  }

  const data = await getDashboardState();
  return NextResponse.json(data);
}

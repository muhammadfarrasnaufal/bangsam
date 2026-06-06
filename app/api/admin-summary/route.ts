import { NextRequest, NextResponse } from "next/server";
import { requireWebAuth } from "../../../lib/route-auth";
import { getAdminSummary } from "../../../lib/web-data";

export async function GET(request: NextRequest) {
  const auth = await requireWebAuth(request);
  if (auth.response) {
    return auth.response;
  }

  const summary = await getAdminSummary();
  return NextResponse.json(summary);
}

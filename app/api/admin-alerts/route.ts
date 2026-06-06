import { NextRequest, NextResponse } from "next/server";
import { requireWebAuth } from "../../../lib/route-auth";
import { getAdminAlerts } from "../../../lib/data";

export async function GET(request: NextRequest) {
  const auth = await requireWebAuth(request);
  if (auth.response) {
    return auth.response;
  }

  const data = await getAdminAlerts();
  return NextResponse.json(data);
}

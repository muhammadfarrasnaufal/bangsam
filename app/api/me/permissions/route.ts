import { NextRequest, NextResponse } from "next/server";
import { getRolePermissions, requireWebAuth } from "../../../../lib/route-auth";

export async function GET(request: NextRequest) {
  const auth = await requireWebAuth(request);
  if (auth.response) {
    return auth.response;
  }

  return NextResponse.json({
    user: auth.user,
    permissions: getRolePermissions(auth.user.role),
  });
}

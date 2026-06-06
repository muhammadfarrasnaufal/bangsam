import { NextResponse, NextRequest } from "next/server";
import { getAdminSessionFromRequest } from "../../../lib/web-session";

export async function GET(request: NextRequest) {
  const user = await getAdminSessionFromRequest(request);
  return NextResponse.json({
    authenticated: Boolean(user),
    user: user
      ? {
          id: user.id,
          nama: user.nama,
          email: user.email,
          role: user.role,
        }
      : null,
  });
}

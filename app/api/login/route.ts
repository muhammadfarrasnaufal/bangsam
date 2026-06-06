import { NextResponse } from "next/server";
import { getAdminByCredentials } from "../../../lib/auth";
import { createAdminSession } from "../../../lib/web-session";

export async function POST(request: Request) {
  const { username, password } = await request.json();
  const admin = await getAdminByCredentials(username, password);

  if (!admin) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const session = await createAdminSession(admin.id);
  const response = NextResponse.json({
    authenticated: true,
    user: admin,
  });
  response.cookies.set({
    name: "admin_session",
    value: session.token,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    expires: session.expiresAt,
    path: "/",
  });
  return response;
}

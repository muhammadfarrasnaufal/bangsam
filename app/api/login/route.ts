import { NextResponse } from "next/server";
import { verifyAdmin } from "../../../lib/auth";

export async function POST(request: Request) {
  const { username, password } = await request.json();
  const authenticated = verifyAdmin(username, password);

  if (!authenticated) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const response = NextResponse.json({ authenticated: true });
  response.cookies.set({
    name: "admin_session",
    value: "1",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24,
    path: "/",
  });
  return response;
}

import { NextRequest, NextResponse } from "next/server";
import { deleteAdminSession } from "../../../lib/web-session";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("admin_session")?.value;
  if (token) {
    await deleteAdminSession(token);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: "admin_session",
    value: "",
    maxAge: 0,
    path: "/",
  });
  return response;
}

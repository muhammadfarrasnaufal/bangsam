import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get("admin_session")?.value;
  const authenticated = cookie === "1";
  return NextResponse.json({ authenticated });
}

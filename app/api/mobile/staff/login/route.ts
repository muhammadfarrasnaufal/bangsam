import { NextResponse } from "next/server";
import { createMobileStaffSession } from "../../../../../lib/mobile-staff-auth";

export async function POST(request: Request) {
  const { identifier = "", password = "" } = await request.json();
  const session = await createMobileStaffSession(identifier, password);

  if (!session) {
    return NextResponse.json(
      { message: "Email/No. HP atau password petugas salah." },
      { status: 401 }
    );
  }

  return NextResponse.json(session);
}

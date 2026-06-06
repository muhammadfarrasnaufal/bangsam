import { NextResponse } from "next/server";
import { getMobileBootstrap } from "../../../../lib/mobile-data";
import { createMobileSession } from "../../../../lib/mobile-auth";

export async function POST(request: Request) {
  const { identifier = "", password = "" } = await request.json();
  const session = await createMobileSession(identifier, password);

  if (!session) {
    return NextResponse.json(
      { message: "Email/No. HP atau password salah." },
      { status: 401 }
    );
  }

  const bootstrap = await getMobileBootstrap(session.memberId);
  return NextResponse.json({
    token: session.token,
    ...bootstrap,
  });
}

import { NextResponse } from "next/server";
import { createMobileSession } from "../../../../lib/mobile-auth";
import { getMobileBootstrap } from "../../../../lib/mobile-data";
import { registerMobileMember } from "../../../../lib/member-verification";

export async function POST(request: Request) {
  try {
    const { nama, email, password, noHp, alamat } = await request.json();

    if (!nama || !email || !password || !noHp) {
      return NextResponse.json(
        { message: "nama, email, password, dan noHp wajib diisi." },
        { status: 400 }
      );
    }

    const registered = await registerMobileMember({ nama, email, password, noHp, alamat });
    const session = await createMobileSession(email, password);

    if (!registered || !session) {
      return NextResponse.json({ message: "Gagal membuat akun mobile." }, { status: 400 });
    }

    const bootstrap = await getMobileBootstrap(session.memberId);

    return NextResponse.json({
      token: session.token,
      message: "Registrasi berhasil. Silakan verifikasi akun ke petugas dengan kode atau QR Anda.",
      ...bootstrap,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal registrasi akun mobile";
    return NextResponse.json({ message }, { status: 400 });
  }
}

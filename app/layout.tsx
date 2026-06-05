import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Admin Bank Sampah",
  description: "Dashboard admin Bank Sampah untuk memantau setoran, transaksi, dan anggota.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}

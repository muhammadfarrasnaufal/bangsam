import { NextResponse } from "next/server";
import { getDashboardState } from "../../../lib/data";

export async function GET() {
  const data = await getDashboardState();
  return NextResponse.json(data);
}

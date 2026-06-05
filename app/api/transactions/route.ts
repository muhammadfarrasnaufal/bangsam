import { NextResponse } from "next/server";
import { addTransaction } from "../../../lib/data";

export async function POST() {
  const data = await addTransaction();
  return NextResponse.json(data);
}

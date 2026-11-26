import { NextResponse } from "next/server";
import { getSession, destroySession } from "@/lib/auth";
export async function GET() {
  const session = await getSession();
  return NextResponse.json({ user: session });
}
export async function DELETE() {
  await destroySession();
  return NextResponse.json({ ok: true });
}

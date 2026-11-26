import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { createHmac } from "node:crypto";

export const runtime = "nodejs";
function digest(email: string, code: string) {
  const secret = process.env.OTP_SECRET;
  if (!secret || secret.length < 32) throw new Error("OTP_SECRET must be at least 32 characters.");
  return createHmac("sha256", secret).update(email + ":" + code).digest("hex");
}
export async function POST(request: NextRequest) {
  let email = "", code = "";
  try {
    const body = await request.json();
    email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    code = typeof body.code === "string" ? body.code.trim() : "";
  } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(code)) return NextResponse.json({ error: "Invalid or expired code." }, { status: 400 });
  const challenge = await prisma.oTPChallenge.findFirst({ where: { email, consumedAt: null, expiresAt: { gt: new Date() }, attempts: { lt: 5 } }, orderBy: { createdAt: "desc" } });
  if (!challenge) return NextResponse.json({ error: "Invalid or expired code." }, { status: 400 });
  const expected = Buffer.from(challenge.codeHash, "hex");
  const supplied = Buffer.from(digest(email, code), "hex");
  const valid = expected.length === supplied.length && timingSafeEqual(expected, supplied);
  if (!valid) {
    await prisma.oTPChallenge.updateMany({ where: { id: challenge.id, consumedAt: null }, data: { attempts: { increment: 1 } } });
    return NextResponse.json({ error: "Invalid or expired code." }, { status: 400 });
  }
  const consumed = await prisma.oTPChallenge.updateMany({ where: { id: challenge.id, consumedAt: null, expiresAt: { gt: new Date() }, attempts: { lt: 5 } }, data: { consumedAt: new Date() } });
  if (consumed.count !== 1) return NextResponse.json({ error: "Invalid or expired code." }, { status: 400 });
  const user = await prisma.user.upsert({ where: { email }, update: {}, create: { email } });
  await createSession({ userId: user.id, email: user.email });
  return NextResponse.json({ user: { id: user.id, email: user.email } });
}

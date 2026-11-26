import { NextRequest, NextResponse } from "next/server";
import { createHmac, randomInt } from "node:crypto";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function digest(email: string, code: string) {
  const secret = process.env.OTP_SECRET;
  if (!secret || secret.length < 32) throw new Error("OTP_SECRET must be at least 32 characters.");
  return createHmac("sha256", secret).update(email + ":" + code).digest("hex");
}
export async function POST(request: NextRequest) {
  let email = "";
  try {
    const body = await request.json();
    email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (!emailPattern.test(email) || email.length > 254) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const recent = await prisma.oTPChallenge.findFirst({ where: { email, createdAt: { gt: new Date(Date.now() - 60_000) } } });
  if (recent) return NextResponse.json({ message: "If the address can receive a code, one will be sent shortly." });
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.oTPChallenge.create({ data: { email, codeHash: digest(email, code), expiresAt: new Date(Date.now() + 10 * 60_000) } });
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    return NextResponse.json({ error: "Email delivery is not configured." }, { status: 503 });
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({ from: process.env.EMAIL_FROM, to: email, subject: "Your VotaChain sign-in code", text: `Your VotaChain verification code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.` });
    if (result.error) throw new Error("Email provider rejected the message.");
  } catch {
    return NextResponse.json({ error: "Unable to deliver a sign-in code right now." }, { status: 503 });
  }
  return NextResponse.json({ message: "If the address can receive a code, one will be sent shortly." });
}

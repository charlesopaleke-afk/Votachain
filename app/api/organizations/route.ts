import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { randomBytes } from "node:crypto";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const memberships = await prisma.membership.findMany({ where: { userId: session.userId }, include: { organization: true }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ organizations: memberships.map(({ organization, role }) => ({ id: organization.id, name: organization.name, slug: organization.slug, role })) });
}
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  let name = "";
  try { const body = await request.json(); name = typeof body.name === "string" ? body.name.trim() : ""; }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (name.length < 2 || name.length > 80) return NextResponse.json({ error: "Organization name must be 2–80 characters." }, { status: 400 });
  const base = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "organization";
  const slug = base + "-" + randomBytes(3).toString("hex");
  const organization = await prisma.organization.create({ data: { name, slug, members: { create: { userId: session.userId, role: "owner" } } } });
  return NextResponse.json({ organization: { id: organization.id, name: organization.name, slug: organization.slug, role: "owner" } }, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireOrganizationRole } from "@/lib/auth";

const MANAGERS = ["owner", "admin", "election_manager"];

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const electionId = request.nextUrl.searchParams.get("electionId");
  if (!electionId) return NextResponse.json({ error: "electionId is required." }, { status: 400 });
  const election = await prisma.election.findUnique({ where: { id: electionId }, select: { id: true, organizationId: true, status: true } });
  if (!election) return NextResponse.json({ error: "Election not found." }, { status: 404 });
  const membership = await prisma.membership.findUnique({ where: { organizationId_userId: { organizationId: election.organizationId, userId: session.userId } } });
  if (!membership) return NextResponse.json({ error: "Organization access denied." }, { status: 403 });
  const voters = await prisma.voter.findMany({ where: { electionId }, orderBy: { email: "asc" }, select: { id: true, email: true } });
  return NextResponse.json({ voters, election });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const electionId = typeof body.electionId === "string" ? body.electionId : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!electionId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    return NextResponse.json({ error: "Provide a valid electionId and email address." }, { status: 400 });
  const election = await prisma.election.findUnique({ where: { id: electionId } });
  if (!election) return NextResponse.json({ error: "Election not found." }, { status: 404 });
  try { await requireOrganizationRole(election.organizationId, MANAGERS); }
  catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: message === "UNAUTHENTICATED" ? "Authentication required." : "Voter management permission required." }, { status: message === "UNAUTHENTICATED" ? 401 : 403 });
  }
  if (election.status === "closed") return NextResponse.json({ error: "Voters cannot be added to a closed election." }, { status: 409 });
  try {
    const voter = await prisma.$transaction(async tx => {
      const created = await tx.voter.create({ data: { electionId, email } });
      await tx.auditEvent.create({ data: { organizationId: election.organizationId, action: "voter.added", details: { electionId, voterId: created.id, actorUserId: session.userId } } });
      return created;
    });
    return NextResponse.json({ voter }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002")
      return NextResponse.json({ error: "This email is already registered for the election." }, { status: 409 });
    throw error;
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const voterId = typeof body.voterId === "string" ? body.voterId : "";
  if (!voterId) return NextResponse.json({ error: "voterId is required." }, { status: 400 });
  const voter = await prisma.voter.findUnique({ where: { id: voterId }, include: { election: true } });
  if (!voter) return NextResponse.json({ error: "Voter not found." }, { status: 404 });
  try { await requireOrganizationRole(voter.election.organizationId, MANAGERS); }
  catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: message === "UNAUTHENTICATED" ? "Authentication required." : "Voter management permission required." }, { status: message === "UNAUTHENTICATED" ? 401 : 403 });
  }
  if (voter.election.status === "closed" || voter.election.status === "open") return NextResponse.json({ error: "Voter lists are locked once an election opens." }, { status: 409 });
  await prisma.$transaction(async tx => {
    await tx.voter.delete({ where: { id: voterId } });
    await tx.auditEvent.create({ data: { organizationId: voter.election.organizationId, action: "voter.removed", details: { electionId: voter.electionId, voterId, actorUserId: session.userId } } });
  });
  return NextResponse.json({ success: true });
}

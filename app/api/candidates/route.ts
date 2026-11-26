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
  const candidates = await prisma.candidate.findMany({ where: { electionId }, orderBy: { name: "asc" } });
  return NextResponse.json({ candidates, election });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const electionId = typeof body.electionId === "string" ? body.electionId : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const details = typeof body.details === "string" ? body.details.trim() : null;
  if (!electionId || name.length < 2 || name.length > 120 || (details && details.length > 2000))
    return NextResponse.json({ error: "Provide an electionId and candidate name (2–120 characters). Details must be at most 2,000 characters." }, { status: 400 });
  const election = await prisma.election.findUnique({ where: { id: electionId } });
  if (!election) return NextResponse.json({ error: "Election not found." }, { status: 404 });
  try { await requireOrganizationRole(election.organizationId, MANAGERS); }
  catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: message === "UNAUTHENTICATED" ? "Authentication required." : "Candidate management permission required." }, { status: message === "UNAUTHENTICATED" ? 401 : 403 });
  }
  if (election.status === "open" || election.status === "closed") return NextResponse.json({ error: "Candidates cannot be changed after an election opens." }, { status: 409 });
  const candidate = await prisma.$transaction(async tx => {
    const created = await tx.candidate.create({ data: { electionId, name, details } });
    await tx.auditEvent.create({ data: { organizationId: election.organizationId, action: "candidate.added", details: { electionId, candidateId: created.id, actorUserId: session.userId } } });
    return created;
  });
  return NextResponse.json({ candidate }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const candidateId = typeof body.candidateId === "string" ? body.candidateId : "";
  if (!candidateId) return NextResponse.json({ error: "candidateId is required." }, { status: 400 });
  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId }, include: { election: true } });
  if (!candidate) return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
  try { await requireOrganizationRole(candidate.election.organizationId, MANAGERS); }
  catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: message === "UNAUTHENTICATED" ? "Authentication required." : "Candidate management permission required." }, { status: message === "UNAUTHENTICATED" ? 401 : 403 });
  }
  if (candidate.election.status === "open" || candidate.election.status === "closed") return NextResponse.json({ error: "Candidates cannot be changed after an election opens." }, { status: 409 });
  await prisma.$transaction(async tx => {
    await tx.candidate.delete({ where: { id: candidateId } });
    await tx.auditEvent.create({ data: { organizationId: candidate.election.organizationId, action: "candidate.removed", details: { electionId: candidate.electionId, candidateId, actorUserId: session.userId } } });
  });
  return NextResponse.json({ success: true });
}

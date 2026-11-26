import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireOrganizationRole } from "@/lib/auth";

const MANAGERS = ["owner", "admin", "election_manager"];
const VALID_STATUSES = ["draft", "scheduled", "open", "closed"] as const;

function dateOrNull(value: unknown): Date | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const organizationId = request.nextUrl.searchParams.get("organizationId");
  if (!organizationId) return NextResponse.json({ error: "organizationId is required." }, { status: 400 });
  const membership = await prisma.membership.findUnique({ where: { organizationId_userId: { organizationId, userId: session.userId } } });
  if (!membership) return NextResponse.json({ error: "Organization access denied." }, { status: 403 });
  const elections = await prisma.election.findMany({
    where: { organizationId }, orderBy: { createdAt: "desc" },
    include: { _count: { select: { candidates: true, voters: true, ballots: true } } }
  });
  return NextResponse.json({ elections });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const organizationId = typeof body.organizationId === "string" ? body.organizationId : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : null;
  if (!organizationId || title.length < 3 || title.length > 160 || (description && description.length > 4000))
    return NextResponse.json({ error: "Provide an organizationId and a title (3–160 characters). Description must be at most 4,000 characters." }, { status: 400 });
  try { await requireOrganizationRole(organizationId, MANAGERS); }
  catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: message === "UNAUTHENTICATED" ? "Authentication required." : "Election management permission required." }, { status: message === "UNAUTHENTICATED" ? 401 : 403 });
  }
  const startsAt = dateOrNull(body.startsAt), endsAt = dateOrNull(body.endsAt);
  if (startsAt === undefined || endsAt === undefined || (startsAt && endsAt && startsAt >= endsAt))
    return NextResponse.json({ error: "Invalid election dates. The end must be after the start." }, { status: 400 });
  const election = await prisma.$transaction(async tx => {
    const created = await tx.election.create({ data: { organizationId, title, description, startsAt, endsAt, status: "draft" } });
    await tx.auditEvent.create({ data: { organizationId, action: "election.created", details: { electionId: created.id, title, actorUserId: session.userId } } });
    return created;
  });
  return NextResponse.json({ election }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const electionId = typeof body.electionId === "string" ? body.electionId : "";
  if (!electionId) return NextResponse.json({ error: "electionId is required." }, { status: 400 });
  const existing = await prisma.election.findUnique({ where: { id: electionId } });
  if (!existing) return NextResponse.json({ error: "Election not found." }, { status: 404 });
  try { await requireOrganizationRole(existing.organizationId, MANAGERS); }
  catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: message === "UNAUTHENTICATED" ? "Authentication required." : "Election management permission required." }, { status: message === "UNAUTHENTICATED" ? 401 : 403 });
  }

  if (existing.status === "closed" && (body.title !== undefined || body.description !== undefined || body.startsAt !== undefined || body.endsAt !== undefined)) return NextResponse.json({ error: "Closed elections cannot be edited." }, { status: 409 });

  const data: { title?: string; description?: string | null; startsAt?: Date | null; endsAt?: Date | null; status?: string } = {};
  if (body.title !== undefined) {
    if (typeof body.title !== "string" || body.title.trim().length < 3 || body.title.trim().length > 160) return NextResponse.json({ error: "Title must be 3–160 characters." }, { status: 400 });
    data.title = body.title.trim();
  }
  if (body.description !== undefined) {
    if (body.description !== null && (typeof body.description !== "string" || body.description.length > 4000)) return NextResponse.json({ error: "Description must be at most 4,000 characters." }, { status: 400 });
    data.description = body.description?.trim() || null;
  }
  if (body.startsAt !== undefined) { const date = dateOrNull(body.startsAt); if (date === undefined) return NextResponse.json({ error: "Invalid startsAt date." }, { status: 400 }); data.startsAt = date; }
  if (body.endsAt !== undefined) { const date = dateOrNull(body.endsAt); if (date === undefined) return NextResponse.json({ error: "Invalid endsAt date." }, { status: 400 }); data.endsAt = date; }
  if (data.startsAt !== undefined || data.endsAt !== undefined) {
    const start = data.startsAt === undefined ? existing.startsAt : data.startsAt;
    const end = data.endsAt === undefined ? existing.endsAt : data.endsAt;
    if (start && end && start >= end) return NextResponse.json({ error: "The end must be after the start." }, { status: 400 });
  }
  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) return NextResponse.json({ error: "Status must be draft, scheduled, open or closed." }, { status: 400 });
    const allowed: Record<string, string[]> = { draft: ["scheduled", "closed"], scheduled: ["draft", "open", "closed"], open: ["closed"], closed: [] };
    if (!allowed[existing.status]?.includes(body.status)) return NextResponse.json({ error: "That election status transition is not allowed." }, { status: 409 });
    if (body.status === "scheduled" && !(data.startsAt ?? existing.startsAt)) return NextResponse.json({ error: "Set a start date before scheduling." }, { status: 400 });
    if (body.status === "open" && (existing.endsAt && existing.endsAt <= new Date())) return NextResponse.json({ error: "The election end date has passed." }, { status: 400 });
    data.status = body.status;
  }
  if (!Object.keys(data).length) return NextResponse.json({ error: "No editable fields supplied." }, { status: 400 });

  const election = await prisma.$transaction(async tx => {
    const updated = await tx.election.update({ where: { id: electionId }, data });
    await tx.auditEvent.create({ data: { organizationId: existing.organizationId, action: "election.updated", details: { electionId, changedFields: Object.keys(data), actorUserId: session.userId } } });
    return updated;
  });
  return NextResponse.json({ election });
}

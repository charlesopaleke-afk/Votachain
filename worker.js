import postgres from "postgres";
import { SignJWT, jwtVerify } from "jose";

const COOKIE = "votachain_session";
const MANAGERS = ["owner", "admin", "election_manager"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const encoder = new TextEncoder();

function json(data, status = 200, headers = {}) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
}
function error(message, status = 400) { return json({ error: message }, status); }
async function readJson(request) {
  if (Number(request.headers.get("content-length") || 0) > 1_000_000) throw new Error("Request body is too large.");
  try { return await request.json(); } catch { throw new Error("Invalid JSON body."); }
}
function assertSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new Error("Cross-origin request rejected.");
}
function getDb(env) {
  const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL;
  if (!connectionString) throw new Error("Database is not configured. Add a Cloudflare Hyperdrive binding named HYPERDRIVE.");
  return postgres(connectionString, { max: 5, fetch_types: false, prepare: true, idle_timeout: 20, connect_timeout: 10 });
}
function secret(value, name) {
  if (typeof value !== "string" || value.length < 32) throw new Error(name + " must be configured with at least 32 characters.");
  return encoder.encode(value);
}
async function hmacHex(keyValue, message) {
  const key = await crypto.subtle.importKey("raw", keyValue, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
  return Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("");
}
function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}
function cookieValue(request, name) {
  const raw = request.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return null;
}
async function readSession(request, env) {
  const token = cookieValue(request, COOKIE);
  if (!token) return null;
  try {
    const result = await jwtVerify(token, secret(env.JWT_SECRET, "JWT_SECRET"), { algorithms: ["HS256"] });
    if (!result.payload.sub || typeof result.payload.email !== "string") return null;
    return { userId: result.payload.sub, email: result.payload.email };
  } catch { return null; }
}
async function makeSessionCookie(session, env, request) {
  const token = await new SignJWT({ email: session.email })
    .setProtectedHeader({ alg: "HS256" }).setSubject(session.userId)
    .setIssuedAt().setExpirationTime("7d")
    .sign(secret(env.JWT_SECRET, "JWT_SECRET"));
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return COOKIE + "=" + token + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800" + secure;
}
function clearSessionCookie(request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return COOKIE + "=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0" + secure;
}
async function membership(sql, organizationId, userId) {
  const rows = await sql`SELECT * FROM "Membership" WHERE "organizationId" = ${organizationId} AND "userId" = ${userId} LIMIT 1`;
  return rows[0] || null;
}
async function requireRole(sql, session, organizationId) {
  const member = await membership(sql, organizationId, session.userId);
  return member && MANAGERS.includes(member.role) ? member : null;
}
async function addAudit(sql, organizationId, action, details) {
  await sql`INSERT INTO "AuditEvent" ("id", "organizationId", "action", "details", "createdAt")
    VALUES (${crypto.randomUUID()}, ${organizationId}, ${action}, ${JSON.stringify(details)}::jsonb, NOW())`;
}
function validDate(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return false;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? false : date.toISOString();
}
async function authRequestOtp(request, env, sql) {
  let body;
  try { body = await readJson(request); } catch (e) { return error(e.message, 400); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email) || email.length > 254) return error("Enter a valid email address.");
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) return error("Email delivery is not configured. Add RESEND_API_KEY and EMAIL_FROM.", 503);
  const recent = await sql`SELECT "id" FROM "OTPChallenge"
    WHERE "email" = ${email} AND "createdAt" > NOW() - INTERVAL '60 seconds'
    ORDER BY "createdAt" DESC LIMIT 1`;
  if (recent.length) return json({ message: "If the address can receive a code, one will be sent shortly." });

  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  const code = String(random[0] % 1_000_000).padStart(6, "0");
  const codeHash = await hmacHex(secret(env.OTP_SECRET, "OTP_SECRET"), email + ":" + code);
  const challengeId = crypto.randomUUID();
  await sql`INSERT INTO "OTPChallenge" ("id", "email", "codeHash", "attempts", "expiresAt", "createdAt")
    VALUES (${challengeId}, ${email}, ${codeHash}, 0, NOW() + INTERVAL '10 minutes', NOW())`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.EMAIL_FROM, to: [email], subject: "Your VotaChain sign-in code",
        text: "Your VotaChain verification code is " + code + ". It expires in 10 minutes. If you did not request this, ignore this email."
      })
    });
    if (!response.ok) throw new Error("Email provider rejected the message.");
  } catch {
    await sql`DELETE FROM "OTPChallenge" WHERE "id" = ${challengeId}`;
    return error("Unable to deliver a sign-in code right now.", 503);
  }
  return json({ message: "If the address can receive a code, one will be sent shortly." });
}
async function authVerifyOtp(request, env, sql) {
  let body;
  try { body = await readJson(request); } catch (e) { return error(e.message, 400); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!EMAIL_RE.test(email) || !/^\d{6}$/.test(code)) return error("Invalid or expired code.");
  const rows = await sql`SELECT * FROM "OTPChallenge"
    WHERE "email" = ${email} AND "consumedAt" IS NULL AND "expiresAt" > NOW() AND "attempts" < 5
    ORDER BY "createdAt" DESC LIMIT 1`;
  const challenge = rows[0];
  if (!challenge) return error("Invalid or expired code.");
  const supplied = await hmacHex(secret(env.OTP_SECRET, "OTP_SECRET"), email + ":" + code);
  if (!constantTimeEqual(String(challenge.codeHash), supplied)) {
    await sql`UPDATE "OTPChallenge" SET "attempts" = "attempts" + 1
      WHERE "id" = ${challenge.id} AND "consumedAt" IS NULL AND "attempts" < 5`;
    return error("Invalid or expired code.");
  }
  const consumed = await sql`UPDATE "OTPChallenge" SET "consumedAt" = NOW()
    WHERE "id" = ${challenge.id} AND "consumedAt" IS NULL
      AND "expiresAt" > NOW() AND "attempts" < 5 RETURNING "id"`;
  if (!consumed.length) return error("Invalid or expired code.");
  const users = await sql`INSERT INTO "User" ("id", "email", "createdAt")
    VALUES (${crypto.randomUUID()}, ${email}, NOW())
    ON CONFLICT ("email") DO UPDATE SET "email" = EXCLUDED."email"
    RETURNING "id", "email"`;
  const user = users[0];
  return json({ user }, 200, { "Set-Cookie": await makeSessionCookie(user, env, request) });
}
async function organizations(request, sql, session) {
  if (request.method === "GET") {
    const rows = await sql`SELECT o."id", o."name", o."slug", m."role"
      FROM "Membership" m JOIN "Organization" o ON o."id" = m."organizationId"
      WHERE m."userId" = ${session.userId} ORDER BY m."createdAt" ASC`;
    return json({ organizations: rows });
  }
  if (request.method !== "POST") return error("Method not allowed.", 405);
  let body;
  try { body = await readJson(request); } catch (e) { return error(e.message, 400); }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 2 || name.length > 80) return error("Organization name must be 2–80 characters.");
  const base = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "organization";
  const id = crypto.randomUUID();
  const slug = base + "-" + crypto.randomUUID().slice(0, 6);
  const organization = await sql.begin(async tx => {
    const inserted = await tx`INSERT INTO "Organization" ("id", "name", "slug", "createdAt")
      VALUES (${id}, ${name}, ${slug}, NOW()) RETURNING "id", "name", "slug"`;
    await tx`INSERT INTO "Membership" ("id", "organizationId", "userId", "role", "createdAt")
      VALUES (${crypto.randomUUID()}, ${id}, ${session.userId}, 'owner', NOW())`;
    return inserted[0];
  });
  return json({ organization: { ...organization, role: "owner" } }, 201);
}
async function elections(request, sql, session, url) {
  if (request.method === "GET") {
    const organizationId = url.searchParams.get("organizationId");
    if (!organizationId) return error("organizationId is required.");
    if (!await membership(sql, organizationId, session.userId)) return error("Organization access denied.", 403);
    const rows = await sql`SELECT e.*,
        (SELECT COUNT(*)::int FROM "Candidate" c WHERE c."electionId" = e."id") AS candidate_count,
        (SELECT COUNT(*)::int FROM "Voter" v WHERE v."electionId" = e."id") AS voter_count,
        (SELECT COUNT(*)::int FROM "Ballot" b WHERE b."electionId" = e."id") AS ballot_count
      FROM "Election" e WHERE e."organizationId" = ${organizationId}
      ORDER BY e."createdAt" DESC`;
    return json({ elections: rows.map(({ candidate_count, voter_count, ballot_count, ...row }) => ({
      ...row, _count: { candidates: candidate_count, voters: voter_count, ballots: ballot_count }
    })) });
  }
  if (request.method === "POST") {
    let body;
    try { body = await readJson(request); } catch (e) { return error(e.message, 400); }
    const organizationId = typeof body.organizationId === "string" ? body.organizationId : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : null;
    if (!organizationId || title.length < 3 || title.length > 160 || (description && description.length > 4000)) {
      return error("Provide an organizationId and a title (3–160 characters). Description must be at most 4,000 characters.");
    }
    if (!await requireRole(sql, session, organizationId)) return error("Election management permission required.", 403);
    const startsAt = validDate(body.startsAt);
    const endsAt = validDate(body.endsAt);
    if (startsAt === false || endsAt === false || (startsAt && endsAt && startsAt >= endsAt)) return error("Invalid election dates. The end must be after the start.");
    const id = crypto.randomUUID();
    const election = await sql.begin(async tx => {
      const inserted = await tx`INSERT INTO "Election"
        ("id", "organizationId", "title", "description", "status", "startsAt", "endsAt", "createdAt", "updatedAt")
        VALUES (${id}, ${organizationId}, ${title}, ${description}, 'draft', ${startsAt}, ${endsAt}, NOW(), NOW())
        RETURNING *`;
      await addAudit(tx, organizationId, "election.created", { electionId: id, title, actorUserId: session.userId });
      return inserted[0];
    });
    return json({ election }, 201);
  }
  if (request.method === "PATCH") {
    let body;
    try { body = await readJson(request); } catch (e) { return error(e.message, 400); }
    const electionId = typeof body.electionId === "string" ? body.electionId : "";
    if (!electionId) return error("electionId is required.");
    const result = await sql.begin(async tx => {
      const found = await tx`SELECT * FROM "Election" WHERE "id" = ${electionId} FOR UPDATE`;
      const existing = found[0];
      if (!existing) return { response: error("Election not found.", 404) };
      if (!await requireRole(tx, session, existing.organizationId)) return { response: error("Election management permission required.", 403) };
      const hasEdits = ["title", "description", "startsAt", "endsAt"].some(key => body[key] !== undefined);
      if (existing.status === "closed" && hasEdits) return { response: error("Closed elections cannot be edited.", 409) };
      const changes = [];
      const changedFields = [];
      if (body.title !== undefined) {
        if (typeof body.title !== "string" || body.title.trim().length < 3 || body.title.trim().length > 160) return { response: error("Title must be 3–160 characters.") };
        changes.push(tx`"title" = ${body.title.trim()}`);
        changedFields.push("title");
      }
      if (body.description !== undefined) {
        if (body.description !== null && (typeof body.description !== "string" || body.description.length > 4000)) return { response: error("Description must be at most 4,000 characters.") };
        changes.push(tx`"description" = ${body.description?.trim() || null}`);
        changedFields.push("description");
      }
      const startsAt = body.startsAt !== undefined ? validDate(body.startsAt) : undefined;
      const endsAt = body.endsAt !== undefined ? validDate(body.endsAt) : undefined;
      if (startsAt === false || endsAt === false) return { response: error("Invalid election date.") };
      if (startsAt !== undefined) { changes.push(tx`"startsAt" = ${startsAt}`); changedFields.push("startsAt"); }
      if (endsAt !== undefined) { changes.push(tx`"endsAt" = ${endsAt}`); changedFields.push("endsAt"); }
      const effectiveStart = startsAt === undefined ? existing.startsAt : startsAt;
      const effectiveEnd = endsAt === undefined ? existing.endsAt : endsAt;
      if (effectiveStart && effectiveEnd && new Date(effectiveStart) >= new Date(effectiveEnd)) return { response: error("The end must be after the start.") };
      if (body.status !== undefined) {
        const valid = ["draft", "scheduled", "open", "closed"];
        const allowed = { draft: ["scheduled", "closed"], scheduled: ["draft", "open", "closed"], open: ["closed"], closed: [] };
        if (!valid.includes(body.status)) return { response: error("Status must be draft, scheduled, open or closed.") };
        if (!allowed[existing.status]?.includes(body.status)) return { response: error("That election status transition is not allowed.", 409) };
        if (body.status === "scheduled" && !effectiveStart) return { response: error("Set a start date before scheduling.") };
        if (body.status === "open" && effectiveEnd && new Date(effectiveEnd) <= new Date()) return { response: error("The election end date has passed.") };
        changes.push(tx`"status" = ${body.status}`);
        changedFields.push("status");
      }
      if (!changes.length) return { response: error("No editable fields supplied.") };
      changes.push(tx`"updatedAt" = NOW()`);
      const updatedRows = await tx`UPDATE "Election" SET ${tx.join(changes, tx`, `)}
        WHERE "id" = ${electionId} RETURNING *`;
      await addAudit(tx, existing.organizationId, "election.updated", { electionId, changedFields, actorUserId: session.userId });
      return { election: updatedRows[0] };
    });
    return result.response || json({ election: result.election });
  }
  return error("Method not allowed.", 405);
}
async function candidates(request, sql, session, url) {
  if (request.method === "GET") {
    const electionId = url.searchParams.get("electionId");
    if (!electionId) return error("electionId is required.");
    const found = await sql`SELECT * FROM "Election" WHERE "id" = ${electionId} LIMIT 1`;
    const election = found[0];
    if (!election) return error("Election not found.", 404);
    if (!await membership(sql, election.organizationId, session.userId)) return error("Organization access denied.", 403);
    const list = await sql`SELECT * FROM "Candidate" WHERE "electionId" = ${electionId} ORDER BY "name" ASC`;
    return json({ candidates: list, election: { id: election.id, organizationId: election.organizationId, status: election.status } });
  }
  if (request.method === "POST") {
    let body;
    try { body = await readJson(request); } catch (e) { return error(e.message, 400); }
    const electionId = typeof body.electionId === "string" ? body.electionId : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const details = typeof body.details === "string" ? body.details.trim() : null;
    if (!electionId || name.length < 2 || name.length > 120 || (details && details.length > 2000)) return error("Provide an electionId and candidate name (2–120 characters). Details must be at most 2,000 characters.");
    const found = await sql`SELECT * FROM "Election" WHERE "id" = ${electionId} LIMIT 1`;
    const election = found[0];
    if (!election) return error("Election not found.", 404);
    if (!await requireRole(sql, session, election.organizationId)) return error("Candidate management permission required.", 403);
    if (["open", "closed"].includes(election.status)) return error("Candidates cannot be changed after an election opens.", 409);
    const candidateId = crypto.randomUUID();
    const candidate = await sql.begin(async tx => {
      const inserted = await tx`INSERT INTO "Candidate" ("id", "electionId", "name", "details")
        VALUES (${candidateId}, ${electionId}, ${name}, ${details}) RETURNING *`;
      await addAudit(tx, election.organizationId, "candidate.added", { electionId, candidateId, actorUserId: session.userId });
      return inserted[0];
    });
    return json({ candidate }, 201);
  }
  if (request.method === "DELETE") {
    let body;
    try { body = await readJson(request); } catch (e) { return error(e.message, 400); }
    const candidateId = typeof body.candidateId === "string" ? body.candidateId : "";
    if (!candidateId) return error("candidateId is required.");
    const result = await sql.begin(async tx => {
      const found = await tx`SELECT c.*, e."organizationId", e."status"
        FROM "Candidate" c JOIN "Election" e ON e."id" = c."electionId"
        WHERE c."id" = ${candidateId} FOR UPDATE`;
      const candidate = found[0];
      if (!candidate) return error("Candidate not found.", 404);
      if (!await requireRole(tx, session, candidate.organizationId)) return error("Candidate management permission required.", 403);
      if (["open", "closed"].includes(candidate.status)) return error("Candidates cannot be changed after an election opens.", 409);
      await tx`DELETE FROM "Candidate" WHERE "id" = ${candidateId}`;
      await addAudit(tx, candidate.organizationId, "candidate.removed", { electionId: candidate.electionId, candidateId, actorUserId: session.userId });
      return null;
    });
    return result || json({ success: true });
  }
  return error("Method not allowed.", 405);
}
async function voters(request, sql, session, url) {
  if (request.method === "GET") {
    const electionId = url.searchParams.get("electionId");
    if (!electionId) return error("electionId is required.");
    const found = await sql`SELECT "id", "organizationId", "status" FROM "Election" WHERE "id" = ${electionId} LIMIT 1`;
    const election = found[0];
    if (!election) return error("Election not found.", 404);
    if (!await membership(sql, election.organizationId, session.userId)) return error("Organization access denied.", 403);
    const list = await sql`SELECT "id", "email" FROM "Voter" WHERE "electionId" = ${electionId} ORDER BY "email" ASC`;
    return json({ voters: list, election });
  }
  if (request.method === "POST") {
    let body;
    try { body = await readJson(request); } catch (e) { return error(e.message, 400); }
    const electionId = typeof body.electionId === "string" ? body.electionId : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!electionId || !EMAIL_RE.test(email) || email.length > 254) return error("Provide a valid electionId and email address.");
    const found = await sql`SELECT * FROM "Election" WHERE "id" = ${electionId} LIMIT 1`;
    const election = found[0];
    if (!election) return error("Election not found.", 404);
    if (!await requireRole(sql, session, election.organizationId)) return error("Voter management permission required.", 403);
    if (election.status === "closed") return error("Voters cannot be added to a closed election.", 409);
    const voterId = crypto.randomUUID();
    try {
      const voter = await sql.begin(async tx => {
        const inserted = await tx`INSERT INTO "Voter" ("id", "electionId", "email")
          VALUES (${voterId}, ${electionId}, ${email}) RETURNING "id", "electionId", "email"`;
        await addAudit(tx, election.organizationId, "voter.added", { electionId, voterId, actorUserId: session.userId });
        return inserted[0];
      });
      return json({ voter }, 201);
    } catch (e) {
      if (e.code === "23505") return error("This email is already registered for the election.", 409);
      throw e;
    }
  }
  if (request.method === "DELETE") {
    let body;
    try { body = await readJson(request); } catch (e) { return error(e.message, 400); }
    const voterId = typeof body.voterId === "string" ? body.voterId : "";
    if (!voterId) return error("voterId is required.");
    const result = await sql.begin(async tx => {
      const found = await tx`SELECT v."id", v."electionId", e."organizationId", e."status"
        FROM "Voter" v JOIN "Election" e ON e."id" = v."electionId"
        WHERE v."id" = ${voterId} FOR UPDATE`;
      const voter = found[0];
      if (!voter) return error("Voter not found.", 404);
      if (!await requireRole(tx, session, voter.organizationId)) return error("Voter management permission required.", 403);
      if (["open", "closed"].includes(voter.status)) return error("Voter lists are locked once an election opens.", 409);
      await tx`DELETE FROM "Voter" WHERE "id" = ${voterId}`;
      await addAudit(tx, voter.organizationId, "voter.removed", { electionId: voter.electionId, voterId, actorUserId: session.userId });
      return null;
    });
    return result || json({ success: true });
  }
  return error("Method not allowed.", 405);
}
async function importVoters(request, sql, session) {
  if (request.method !== "POST") return error("Method not allowed.", 405);
  let body;
  try { body = await readJson(request); } catch (e) { return error(e.message, 400); }
  const electionId = typeof body.electionId === "string" ? body.electionId : "";
  const raw = Array.isArray(body.emails) ? body.emails : [];
  if (!electionId || raw.length === 0 || raw.length > 500) return error("Provide an electionId and up to 500 email addresses.");
  const validEntries = raw.map(value => typeof value === "string" ? value.trim().toLowerCase() : "")
    .filter(value => EMAIL_RE.test(value) && value.length <= 254);
  const emails = [...new Set(validEntries)];
  if (!emails.length) return error("No valid email addresses were supplied.");
  const found = await sql`SELECT * FROM "Election" WHERE "id" = ${electionId} LIMIT 1`;
  const election = found[0];
  if (!election) return error("Election not found.", 404);
  if (!await requireRole(sql, session, election.organizationId)) return error("Voter management permission required.", 403);
  if (["open", "closed"].includes(election.status)) return error("Voter lists are locked once an election opens.", 409);
  const added = await sql.begin(async tx => {
    let count = 0;
    for (const email of emails) {
      const inserted = await tx`INSERT INTO "Voter" ("id", "electionId", "email")
        VALUES (${crypto.randomUUID()}, ${electionId}, ${email})
        ON CONFLICT ("electionId", "email") DO NOTHING RETURNING "id"`;
      count += inserted.length;
    }
    if (count) await addAudit(tx, election.organizationId, "voters.bulk_added", { electionId, addedCount: count, actorUserId: session.userId });
    return count;
  });
  return json({
    submitted: raw.length, validUnique: emails.length, added,
    duplicates: validEntries.length - added, invalid: raw.length - validEntries.length
  });
}
async function auditEvents(request, sql, session, url) {
  if (request.method !== "GET") return error("Method not allowed.", 405);
  const organizationId = url.searchParams.get("organizationId");
  if (!organizationId) return error("organizationId is required.");
  if (!await membership(sql, organizationId, session.userId)) return error("Organization access denied.", 403);
  const events = await sql`SELECT * FROM "AuditEvent" WHERE "organizationId" = ${organizationId}
    ORDER BY "createdAt" DESC LIMIT 100`;
  return json({ events });
}
async function routeApi(request, env, sql) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (path === "/api/auth/request-otp") return request.method === "POST" ? authRequestOtp(request, env, sql) : error("Method not allowed.", 405);
  if (path === "/api/auth/verify-otp") return request.method === "POST" ? authVerifyOtp(request, env, sql) : error("Method not allowed.", 405);
  if (path === "/api/auth/session") {
    if (request.method === "GET") return json({ user: await readSession(request, env) });
    if (request.method === "DELETE") return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie(request) });
    return error("Method not allowed.", 405);
  }
  const session = await readSession(request, env);
  if (!session) return error("Authentication required.", 401);
  if (path === "/api/organizations") return organizations(request, sql, session);
  if (path === "/api/elections") return elections(request, sql, session, url);
  if (path === "/api/candidates") return candidates(request, sql, session, url);
  if (path === "/api/voters") return voters(request, sql, session, url);
  if (path === "/api/voters/import") return importVoters(request, sql, session);
  if (path === "/api/audit") return auditEvents(request, sql, session, url);
  return error("API route not found.", 404);
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    try {
      if (!["GET", "HEAD"].includes(request.method)) assertSameOrigin(request);
      if (url.pathname === "/api/health") {
        const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL;
        if (!connectionString) return json({ ok: false, database: "not_configured" }, 503);
        const sql = getDb(env);
        try {
          await sql`SELECT 1 AS ok`;
          return json({ ok: true, database: "connected" });
        } finally { await sql.end({ timeout: 1 }); }
      }
      const sql = getDb(env);
      try { return await routeApi(request, env, sql); }
      finally { await sql.end({ timeout: 1 }); }
    } catch (e) {
      console.error("VotaChain request failed:", e);
      const message = e instanceof Error ? e.message : "Unexpected server error.";
      if (message.includes("not configured") || message.includes("must be configured")) return error(message, 503);
      if (message.includes("Cross-origin")) return error(message, 403);
      return error("Internal server error. Check Worker logs for details.", 500);
    }
  }
};

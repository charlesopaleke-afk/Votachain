-- VotaChain PostgreSQL schema. Run against a new database before using the API.
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "Organization" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "Membership" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id"),
  "userId" TEXT NOT NULL REFERENCES "User"("id"),
  "role" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("organizationId", "userId")
);
CREATE TABLE IF NOT EXISTS "Election" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id"),
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "startsAt" TIMESTAMPTZ,
  "endsAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "Election_organizationId_status_startsAt_idx"
  ON "Election"("organizationId", "status", "startsAt");
CREATE TABLE IF NOT EXISTS "Candidate" (
  "id" TEXT PRIMARY KEY,
  "electionId" TEXT NOT NULL REFERENCES "Election"("id"),
  "name" TEXT NOT NULL,
  "details" TEXT
);
CREATE TABLE IF NOT EXISTS "Voter" (
  "id" TEXT PRIMARY KEY,
  "electionId" TEXT NOT NULL REFERENCES "Election"("id"),
  "email" TEXT NOT NULL,
  UNIQUE ("electionId", "email")
);
CREATE TABLE IF NOT EXISTS "OTPChallenge" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "consumedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "OTPChallenge_email_createdAt_idx"
  ON "OTPChallenge"("email", "createdAt");
CREATE TABLE IF NOT EXISTS "Ballot" (
  "id" TEXT PRIMARY KEY,
  "electionId" TEXT NOT NULL REFERENCES "Election"("id"),
  "nullifier" TEXT NOT NULL,
  "encryptedPayload" TEXT NOT NULL,
  "anchorTxHash" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("electionId", "nullifier")
);
CREATE TABLE IF NOT EXISTS "AuditEvent" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT,
  "action" TEXT NOT NULL,
  "details" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "AuditEvent_organizationId_createdAt_idx"
  ON "AuditEvent"("organizationId", "createdAt");

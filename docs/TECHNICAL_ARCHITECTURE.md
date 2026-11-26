# Technical Architecture

## Proposed stack
Next.js App Router, React and TypeScript; route handlers initially; PostgreSQL with Prisma; Redis-compatible cache/queue/rate limiter; email provider adapter; Polygon adapter; structured logs, metrics, traces and error reporting.

## Logical components
1. Identity: email verification, OTP challenges, sessions, revocation.
2. Tenant: organizations, memberships, invitations and role policy.
3. Election: configuration, lifecycle, ballot definition, schedules and freeze/versioning.
4. Eligibility: voter import, validation and deduplication.
5. Ballot gateway: election state, voting authorization, protocol envelope validation and atomic duplicate prevention.
6. Tally: reviewed protocol implementation, isolated proof generation.
7. Audit: append-only administrative/lifecycle events with redaction.
8. Chain adapter: commitment anchoring, transaction status and retry.
9. Notifications: invitation, OTP and lifecycle messages.
10. Admin/reporting UI: tenant-scoped management and publication.

## Trust boundaries
Browser/device is untrusted. API enforces access but must not be the sole guarantor of ballot secrecy. Database operators must not trivially correlate identities and choices. Email provider sees recipient addresses. Polygon is public and permanent. Platform admins are privileged insiders and require least privilege, approvals and audited break-glass access.

## Election state machine
DRAFT → REVIEW → SCHEDULED → OPEN → CLOSED → TALLYING → FINALIZED → ARCHIVED. Server validates transitions and records append-only events. Store timestamps in UTC and retain IANA timezone for display. Amendments after freeze require versioning, approvals and disclosure.

## Deployment topology
CDN/WAF; stateless app instances; private PostgreSQL with encrypted backups/PITR; isolated queue/cache; workers for email/import/scheduling/chain; secrets manager; separate dev/staging/testnet/production; CI gates for typecheck, lint, tests, migration checks, build and security scans.

## Reliability
Idempotency for submissions/imports/anchors. Bounded retries and dead-letter queues. Replay-safe election schedules. Clock synchronization, tested restore procedures, monitoring and defined SLOs.

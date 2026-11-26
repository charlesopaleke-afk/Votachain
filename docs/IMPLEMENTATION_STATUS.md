# Implementation status

## Implemented in this branch
- Email OTP request and verification endpoints.
- OTPs are generated with a cryptographically secure random generator, stored as HMAC digests, expire after ten minutes, and are limited to five verification attempts.
- OTP challenges are consumed atomically to prevent successful reuse.
- Signed seven-day session cookie with HttpOnly, SameSite=Lax and production Secure settings.
- Session inspection and logout endpoints.
- Organization creation and membership listing; creator is assigned the owner role.
- Server-side organization membership/role guard helper.

## Required configuration
- `DATABASE_URL`
- `JWT_SECRET` (at least 32 characters of high-entropy random data)
- `OTP_SECRET` (a separate, independent secret of at least 32 characters)
- `RESEND_API_KEY`
- `EMAIL_FROM` (a sender identity verified with Resend)
- `APP_URL`

Run `npx prisma generate` and `npx prisma db push` for a development database, or create and review a Prisma migration for production before deploying.

## Important limitations before production
- Add a shared, durable rate limiter (for example Redis or a database-backed bucket) across OTP request and verification endpoints; the current per-email resend cooldown is a basic safeguard, not a complete abuse-control system.
- Add CSRF/origin protection for cookie-authenticated mutations, session revocation/rotation, email delivery monitoring, and security logging.
- Configure provider-level sending limits and abuse detection.
- Add organization invite/role-management workflows and tests.
- This is identity and tenant scaffolding only. It is not an implementation of an election, secret ballot, verifiable tally, or legally certified voting system.


## Election management module

- `GET /api/elections?organizationId=...` lists elections for an organization after verifying membership.
- `POST /api/elections` creates a draft election for an organization; restricted to owner, admin, or election_manager membership roles.
- `PATCH /api/elections` updates election metadata/dates and advances the draft → scheduled → open → closed lifecycle with server-side transition checks.
- Election creation and updates write organization-scoped audit events in the same database transaction.
- Election records now include an `updatedAt` timestamp and an organization/status/start-date index.

This is an initial administrative API foundation. Candidate and voter management, bulk import, automatic lifecycle scheduling, concurrency/race-condition tests, and the actual ballot protocol are not yet implemented. Run Prisma generation and database migration/push, then add automated tests before treating these endpoints as deployable.

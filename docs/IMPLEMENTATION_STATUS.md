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


## Connected organization dashboard

- The dashboard now checks the signed-in session and loads the user's organization memberships from `GET /api/organizations`.
- Organization selection controls which election list is loaded from `GET /api/elections?organizationId=...`.
- Dashboard totals and election rows are calculated from persisted election, voter, candidate, and ballot counts returned by the API; static demonstration election records have been removed.
- The create-election form submits to `POST /api/elections`, creates a persisted draft, and refreshes the selected organization's election list.
- Empty, unauthenticated, loading, and API-error states are represented in the UI.
- The dashboard can create an organization through the existing organization endpoint when the signed-in user has none.

This is an API-connected UI implementation, not a tested deployment. It still requires configured PostgreSQL, Prisma client generation/migrations, email/OTP configuration for sign-in, and a successful build/runtime test. The dashboard's secondary navigation destinations (voters, candidates, audit log) are placeholders; those modules are not implemented yet.

- Added an email OTP sign-in screen at `/login`, wired to the existing OTP request and verification endpoints. Successful verification redirects to the connected dashboard.

## Voter and candidate administration

- Added election-scoped voter endpoints: list, add and remove.
- Voter email addresses are trimmed and normalized to lowercase; malformed addresses are rejected and the database's election/email unique constraint prevents duplicate registrations.
- Voter mutations require owner, admin or election_manager membership and are recorded in the organization audit trail.
- Voter removal is blocked after an election opens; adding voters is blocked for closed elections.
- Added a connected voter register page at `/voters` with organization/election selection, registration, removal and empty/loading/error states.
- Added election-scoped candidate endpoints: list, add and remove, with organization membership/role checks and audit events. Candidate changes are blocked after an election opens.
- Added a connected candidate management page at `/candidates` with organization/election selection, candidate registration, optional profile/manifesto summary, removal, locked-state handling for open/closed elections, and loading/error/empty states.
- CSV import, voter invitation/OTP eligibility flow, pagination, and automated integration tests remain outstanding. These APIs and pages have not yet been run against a configured database or production build.

## Bulk voter import
- Added `POST /api/voters/import`: accepts batches of up to 500 emails, validates and normalizes addresses, de-duplicates the submitted list and existing records, inserts with duplicate-safe `createMany`, and records a batch audit event.
- Added paste-based CSV import in the voter register UI, using the first column as email addresses, with status reporting and refresh after import.
- Imports are blocked for open and closed elections. Database integration and build tests are still pending.

## Cloudflare structure/deployment planning
- Added `docs/CLOUDFLARE_DEPLOYMENT.md` describing route discovery/build watch-path policy and the OpenNext Workers adapter migration checklist.
- Next.js nested `app/` directories are necessary route conventions and should not be flattened.
- Cloudflare adapter configuration and runtime compatibility are not yet verified.

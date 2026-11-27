# Implementation status

## Flat Worker migration

- Added root-level single-page frontend entry and client-side route handling.
- Added a central Cloudflare Worker router for the active API endpoints.
- Switched package dependencies and scripts from Next.js/OpenNext to Vite, Wrangler, JOSE and Postgres.js.
- Added a PostgreSQL schema file at the repository root.
- Removed the retired Next.js pages, route handlers, Prisma client helper and Next.js build configuration.
- Kept the working branch isolated from `main`.

## API endpoints in the Worker

- `GET /api/health`
- `POST /api/auth/request-otp`
- `POST /api/auth/verify-otp`
- `GET /api/auth/session`
- `DELETE /api/auth/session`
- `GET/POST /api/organizations`
- `GET/POST/PATCH /api/elections`
- `GET/POST/DELETE /api/voters`
- `POST /api/voters/import`
- `GET/POST/DELETE /api/candidates`
- `GET /api/audit`

The frontend now provides OTP sign-in, organization creation/selection, election administration, voter registration/import/removal, candidate management and an audit log view.

## Required configuration

- Cloudflare Hyperdrive binding named `HYPERDRIVE` for production PostgreSQL access, or local `DATABASE_URL` in `.dev.vars`.
- `JWT_SECRET` and `OTP_SECRET`: distinct random values of at least 32 characters.
- `RESEND_API_KEY` and `EMAIL_FROM`: verified Resend sender configuration.

Apply `schema.sql` to a new PostgreSQL database. Existing databases created with the prior Prisma schema use the same quoted table and column names; confirm the schema before applying any changes.

## Still outstanding

- Durable IP-based OTP abuse controls and global rate limits.
- CSRF token protection and session revocation/rotation.
- Full test coverage, end-to-end tests and a production security audit.
- Migration and rollback automation.
- Actual ballot submission, cryptographic anonymity, verifiable tally and Polygon anchoring.

A source push does not equal a successful build or live deployment. The Cloudflare Worker has not been deployed, and database/email integrations require environment credentials to test. VotaChain must not be used for binding elections.

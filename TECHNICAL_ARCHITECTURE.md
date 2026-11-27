# Technical Architecture

## Active implementation

- Static single-page application: root-level `index.html`, `client.js`, `styles.css`.
- Cloudflare Workers: root-level `worker.js` central API router.
- PostgreSQL: existing relational data model, defined in root-level `schema.sql`.
- Database connectivity: Postgres.js through Cloudflare Hyperdrive (or local `DATABASE_URL` during development).
- Authentication: email OTP delivery through Resend and signed seven-day HttpOnly session cookies using JOSE.

## Implemented API areas

1. Authentication: OTP request/verification and session/logout.
2. Tenant management: organization list/create and membership roles.
3. Election administration: list/create/update and lifecycle state checks.
4. Eligibility: voter add/list/remove and CSV-style bulk email import.
5. Candidate administration: add/list/remove.
6. Audit: organization-scoped administrative event listing.

## Trust boundaries

The browser is untrusted. The Worker enforces authentication and organization membership on protected APIs. Database credentials and signing secrets must be stored as Worker secrets or bindings. Email providers can see recipient addresses. Public-chain records are permanent and must not contain voter identities or ballot choices.

## Important product boundary

This is an administrative foundation, not a secure voting protocol. Ballot submission, anonymity, cryptographic proofs, tally verification, chain anchoring and independent security assessment are not implemented.

## Planned hardening

Durable IP and account abuse throttling, CSRF token protection, session revocation/rotation, election concurrency controls, idempotent operations, migration automation, comprehensive tests, monitoring and independent security review remain required before production.

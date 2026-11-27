# Proposed API Blueprint

These are proposed contracts, not implemented endpoints unless present in source. Use versioned JSON, schema validation, consistent errors, authorization and idempotency keys for mutations.

## Auth
POST /api/v1/auth/otp/request — generic rate-limited OTP request response.
POST /api/v1/auth/otp/verify — verify and atomically consume OTP; issue secure session.
POST /api/v1/auth/logout — revoke session.
GET /api/v1/auth/session — minimal role/session context.

## Organizations
POST /api/v1/organizations; GET /api/v1/organizations; GET/PATCH /api/v1/organizations/{organizationId}; POST /api/v1/organizations/{organizationId}/members/invitations; PATCH /api/v1/organizations/{organizationId}/members/{membershipId}.

## Elections
POST/GET /api/v1/organizations/{organizationId}/elections; GET/PATCH /api/v1/elections/{electionId}; POST /api/v1/elections/{electionId}/submit-for-review; POST /api/v1/elections/{electionId}/approve; POST /api/v1/elections/{electionId}/open; POST /api/v1/elections/{electionId}/close.

## Eligibility and voting
POST /api/v1/elections/{electionId}/voters/import; GET /api/v1/elections/{electionId}/voters/imports/{batchId}; POST /api/v1/elections/{electionId}/voting/authorize; POST /api/v1/elections/{electionId}/ballots; GET /api/v1/elections/{electionId}/ballots/receipt/{receiptId}.

## Tally, audit and verification
POST /api/v1/elections/{electionId}/tally-runs; GET /api/v1/elections/{electionId}/results; GET /api/v1/elections/{electionId}/verification; GET /api/v1/elections/{electionId}/anchors; GET /api/v1/organizations/{organizationId}/audit-events.

## Error codes
VALIDATION_ERROR, UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, ELECTION_NOT_OPEN, OTP_INVALID, OTP_EXPIRED, RATE_LIMITED, DUPLICATE_SUBMISSION, IDEMPOTENCY_CONFLICT, INTERNAL_ERROR. Do not reveal whether an email is registered.

# Delivery Roadmap

## Phase 0 — decisions and foundation
Confirm target market, election type, jurisdiction, legal constraints, cryptographic protocol, threat model, tenancy, retention, SLO/RPO/RTO and environments. Exit: architecture decisions and security/privacy requirements approved.

## Phase 1 — identity and tenancy
Harden OTP, atomic consume, rate limits, abuse controls, sessions, revocation, CSRF, organization onboarding, invitations, RBAC and tenant-isolation tests. Exit: cross-tenant tests pass; auth abuse tests pass.

## Phase 2 — election administration
Draft CRUD, options, versioned ballot definition, state machine, timezone-safe scheduling, voter import/validation, audit events, dual approval and config freeze. Exit: admin workflow complete in staging.

## Phase 3 — voter experience
Accessible mobile-first flow, OTP, eligibility, one-time authorization, protocol-compliant encrypted ballot, receipt and verifier. Exit: protocol conformance tests pass; no identity-to-choice join path.

## Phase 4 — tally and verifiability
Reviewed tally, proofs, public bulletin board, independent verifier, reproducible result package and external cryptographic review. Exit: verifier confirms evidence; critical findings resolved.

## Phase 5 — Polygon
Contract threat review, Polygon Amoy testnet, non-sensitive commitments only, retry-safe anchoring, confirmation/reorg handling, audited key custody. Mainnet only after audit and operational sign-off.

## Phase 6 — production readiness
Load/accessibility/penetration tests, disaster recovery and incident exercises, privacy/legal assessment, support runbooks, customer terms and limited non-binding pilot. Exit: all security release gates pass.

Security/protocol decisions precede ballot implementation. Blockchain is not a substitute for election integrity.

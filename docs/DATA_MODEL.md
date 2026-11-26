# Target Data Model

The current Prisma schema is a starter scaffold, not the final model. Refine it after protocol and threat-model decisions.

## Tenant and identity
Organization; User; Membership; Invitation; Session (hashed/rotatable identifier, expiry, revocation); OTPChallenge (protected verifier, purpose, expiry, attempts, consumed time, delivery state).

## Election configuration
Election (tenant, type, state, timezone, schedule, policy version, frozen configuration hash); versioned BallotDefinition; Candidate/Option; ElectionApproval; append-only ElectionEvent.

## Eligibility
VoterEligibility (election-scoped protected identity reference, import batch, status); ImportBatch (uploader, encrypted source, validation summary, retention); VotingAuthorization (protocol-defined short-lived authorization that cannot become a stable identity-to-ballot join key).

## Ballot and tally
BallotEnvelope (protocol-defined encrypted ballot only); election-scoped Nullifier; TallyRun (protocol/software version, input/output commitments, approvals); VerificationArtifact; ResultPublication.

## Audit and chain
AuditEvent (actor class, tenant/election scope, action, redacted metadata); ChainAnchor (network, chain ID, contract, commitment, transaction, block, confirmations, retry status); KeyMetadata (purpose, custody provider, version, rotation state; never raw private key).

## Invariants
Tenant-scoped authorization on every read/write; immutable frozen config except approved amendments; atomic one-nullifier-per-election; no direct voter identifier in ballot storage; one-time OTP consume; append-only redacted audit; non-sensitive chain commitments only; explicit retention per data category.

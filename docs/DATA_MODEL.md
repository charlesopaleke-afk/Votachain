# VotaChain Data Model

## Active PostgreSQL schema

The deployed Worker uses the root-level `schema.sql` file. The active relational tables are:

- `User`: verified email account.
- `Organization`: tenant/workspace.
- `Membership`: user-to-organization role relation.
- `Election`: organization-scoped election metadata and lifecycle status.
- `Candidate`: election candidate details.
- `Voter`: election-scoped eligible voter email register.
- `OTPChallenge`: HMAC-protected one-time sign-in challenge, expiry, attempt count and consume timestamp.
- `Ballot`: placeholder only; it is not a working ballot protocol.
- `AuditEvent`: organization-scoped administrative event and JSON details.

Quoted PostgreSQL identifiers preserve the previous Prisma-generated table and camelCase column names so a database created from the earlier Prisma model can be checked for compatibility.

## Required future model extensions

- **Identity and sessions:** invitations, explicit session revocation/rotation, challenge purpose, delivery status, IP/device abuse counters.
- **Election configuration:** election type, IANA timezone, frozen configuration versions/hashes, candidate/option ordering, approvals and immutable lifecycle events.
- **Eligibility:** import batch metadata, voter verification state, source/retention tracking and protected identity references.
- **Ballot/tally:** protocol-specific encrypted ballot envelope, election-scoped nullifiers, tally runs, verification artifacts and result publication. These must only be designed after selecting and reviewing a cryptographic voting protocol.
- **Chain audit:** network, chain ID, contract, non-sensitive commitment, transaction, block, confirmations and retry state.
- **Audit:** actor class, election scope, redaction policy, tamper resistance and retention.

## Invariants

- Enforce organization membership and role on every tenant/election API read and write.
- Keep voter identity out of ballot records.
- Make OTP single-use and expire old challenges.
- Record administrative mutations in the audit table.
- Do not put voter identity or ballot selections on a public blockchain.
- The current Ballot table must not be treated as proof of ballot secrecy, duplicate prevention or verifiable tally.

The current schema is an early administrative foundation and does not establish legal identity, secret-ballot integrity or end-to-end verifiability.

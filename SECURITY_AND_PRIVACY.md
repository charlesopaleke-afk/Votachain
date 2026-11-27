# Security, Privacy and Election Integrity

## Critical warning
A blockchain transaction does not make an election anonymous, fair, coercion-resistant or verifiable. Encrypted payload and nullifier columns are not a secure voting protocol. Do not use this scaffold for binding or high-stakes elections.

## Cryptographic design gate
Select a reviewed protocol before implementation. Evaluate end-to-end verifiability, secrecy, unlinkability, eligibility proofs, duplicate prevention, mixnets or homomorphic tallying, threshold decryption, bulletin-board consistency, receipt-freeness and coercion resistance. Do not invent primitives. Publish assumptions and limitations.

## Identity/ballot separation
Keep personally identifiable voter records in a separately controlled store/service. Ballot records must not contain email, user ID, IP, OTP challenge ID, session ID or direct identity references. Nullifier and authorization semantics must be defined by the selected protocol. Separation alone does not guarantee anonymity.

## Authentication controls
Use cryptographically random numeric OTPs, protected verifiers, short expiry, single-use atomic consumption, attempt limits and rate limits by account/IP/device/election. Prevent account enumeration. Use secure HttpOnly SameSite cookies, rotate sessions, protect state-changing requests against CSRF, revoke sessions and never log secrets. Email OTP proves mailbox access, not legal identity.

## Authorization and tenancy
Deny by default. Check organization membership, role and object scope on every server request. Test cross-tenant IDOR. Separate platform support from tenant admin. Require step-up authentication and two-person approval for publish/open/close/finalize/export operations.

## Infrastructure and privacy
TLS; encryption at rest; managed secrets; least-privilege identities; private database; WAF; CSP/security headers; dependency scanning; backups; immutable audit storage; alerting; DDoS controls. Chain signing keys belong in HSM/KMS or controlled multisig, never source control. Map data purpose, lawful basis, retention, deletion, processor contracts and breach duties per jurisdiction. Never put personal data on-chain.

## Threat model
Malicious tenant admin; insider correlation; compromised mailbox; OTP brute force; cross-tenant access; replay/duplicate submission; schedule manipulation; database compromise; compromised device; denial of service; RPC outage/reorg; signer compromise; malicious tally update; coercion or vote buying. Record assets, adversary, likelihood, impact, mitigation, residual risk and test evidence.

## Release gates
Independent cryptographic review; penetration test; threat-model sign-off; SAST/DAST/dependency scans; tenant-isolation tests; load/abuse tests; key ceremony; restore test; incident exercise; verifier reproducibility; legal/privacy review. No high-stakes deployment until all pass.

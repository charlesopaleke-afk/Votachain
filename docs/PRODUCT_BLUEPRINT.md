# VotaChain Product Blueprint

## Vision
A multi-tenant SaaS for organizations to configure elections, enroll eligible voters, run controlled voting windows and publish independently verifiable election records. Polygon is an audit-anchoring layer, not a store for identities or ballot selections.

## Principles
- Secret by design: separate voter identity from ballot content.
- Verifiable: provide evidence that independent tools can check.
- Accessible: email plus numeric OTP; no crypto wallet required.
- Tenant isolation: organizations own members, elections, voter rolls and reports.
- Honest assurance: never claim anonymity, coercion resistance or legal compliance until independently reviewed.

## Personas and roles
Platform operator; organization owner; election administrator; auditor/observer; voter. Enforce every role and resource scope on the server, never merely by hiding UI controls.

## Main journeys
1. Onboard organization, verify owner email, invite admins and assign roles.
2. Create election draft, configure rules/options/schedule, import eligible voters, validate records, preview, obtain second-person approval and freeze configuration.
3. Voter opens election link, checks status, enters eligible email, receives rate-limited OTP, verifies, receives short-lived voting authorization, submits protocol-encrypted ballot and receives a non-revealing receipt.
4. Close election, reconcile accepted submissions, run approved tally protocol, publish results and verification package, anchor package hash to Polygon.

## MVP scope
Tenant workspaces and RBAC; email OTP and sessions; election CRUD and lifecycle; candidates/options; voter eligibility import; audit events; ballot submission boundary; results shell; Polygon testnet anchoring adapter for non-sensitive hashes.

## Out of scope initially
Binding governmental/high-stakes elections; claims of identity proofing; on-chain voter lists or vote choices; unreviewed cryptography; guaranteed coercion resistance; token-weighted voting without explicit legal/product approval.

## Success metrics
Onboarding completion; time to first election; OTP delivery/completion; ballot submission and duplicate rejection rates; uptime and p95 latency; proof verification success; support incidents and abuse rates.

## Release gates
No real election until cryptographic protocol review, penetration test, threat-model approval, recovery drills, legal/privacy review, accessibility and load testing, and operational support are complete.

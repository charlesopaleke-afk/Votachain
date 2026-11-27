# Architecture Decision Records

## ADR-001 — Polygon is an audit anchor
Status: proposed. Store only non-sensitive commitments and lifecycle anchors on Polygon. Public-chain data is permanent; no identity or ballot choice belongs on-chain. Anchoring provides tamper evidence, not secrecy or correctness by itself.

## ADR-002 — Email OTP is not legal identity proofing
Status: proposed. OTP proves control of a mailbox at a moment, not a person's legal identity. Product claims must reflect this limit.

## ADR-003 — Cryptographic ballot protocol is a gated dependency
Status: required. No custom ballot/tally cryptography before protocol selection and independent review. Current ballot schema is placeholder scaffolding.

## ADR-004 — Tenant authorization is server-enforced
Status: required. Every tenant/election access checks membership, role and scope server-side. Automated tests cover cross-tenant access.

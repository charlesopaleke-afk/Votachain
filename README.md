# VotaChain

**VotaChain** is a multi-organization voting SaaS foundation for election administrators to manage elections, eligible voters and candidates, with a planned privacy-preserving voting protocol and Polygon-based public anchoring.

> **Status: Early development.** Not a production voting service, not certified, and not suitable for binding or high-stakes elections. The cryptographic ballot protocol, end-to-end verifiability and independent security assessment are not implemented.

## Current features
- Organization and membership foundation.
- Email OTP authentication and session endpoints.
- Organization dashboard and election administration.
- Election lifecycle API (draft/scheduled/open/closed).
- Candidate management screen and API.
- Voter register with single-entry management.
- Bulk voter import (up to 500 addresses per batch): normalization, validation, duplicate handling, import summary and audit event.
- Audit events for several administrative changes.

## Routes
| Route | Purpose |
|---|---|
| `/` | Landing page |
| `/login` | Email OTP sign-in |
| `/dashboard` | Organization and election dashboard |
| `/voters` | Voter register and bulk import |
| `/candidates` | Candidate administration |
| `/api/auth/request-otp` | Request email OTP |
| `/api/auth/verify-otp` | Verify OTP and create session |
| `/api/auth/session` | Session inspection/logout |
| `/api/organizations` | Organization API |
| `/api/elections` | Election administration API |
| `/api/voters` | Voter register API |
| `/api/voters/import` | Batch voter import API |
| `/api/candidates` | Candidate API |

Next.js App Router discovers routes from nested directories under `app/`. **Do not flatten these folders.** Keep the application at the repository root and configure the Cloudflare build to include all repository paths.

## Technology foundation
- Next.js App Router
- TypeScript
- PostgreSQL
- Prisma ORM
- Resend email provider (OTP)
- Polygon integration boundary (actual ballot protocol/anchoring is not implemented)

## Repository structure
```
Votachain/
├── app/                 # Next.js pages and API route handlers
├── lib/                 # Shared server utilities
├── prisma/              # Database schema
├── contracts/           # Blockchain design notes
├── docs/                # Product, architecture, security and deployment docs
├── package.json
├── next.config.ts
└── README.md
```
This structure is intentionally nested according to Next.js conventions.

## Local development

### Prerequisites
- Node.js compatible with installed Next.js release
- PostgreSQL database
- Resend account/API key and verified sender for OTP delivery

### Setup
```bash
git clone https://github.com/charlesopaleke-afk/Votachain.git
cd Votachain
git checkout blueprint/votachain-complete-blueprint
npm install
cp .env.example .env
```
Configure environment variables in `.env`; never commit secrets.

```bash
npx prisma generate
```

For a disposable development database, synchronize schema:
```bash
npx prisma db push
```
Use reviewed migrations for production.

Start:
```bash
npm run dev
```
Open `http://localhost:3000`.

## Cloudflare deployment
The intended target is **Cloudflare Workers with the OpenNext Cloudflare adapter** for Next.js. OpenNext adapter configuration files and deployment scripts are now present. Adapter build, runtime and database compatibility remain unvalidated.

- Keep the repository root as the application root.
- Ensure build watch paths include the full repository (Cloudflare default include pattern `*`; avoid excluding route folders).
- Do not flatten nested `app/` route folders.
- Store secrets in Cloudflare environment/secret settings, not repository files.
- Run `npm run preview` to build and preview using the Workers runtime.
- Run `npm run deploy` only when ready to deploy; it deploys the built Worker.
- Test a preview Worker and verify every page and API endpoint before production.

See [Cloudflare deployment guide](docs/CLOUDFLARE_DEPLOYMENT.md).

## Security status and limitations
Security work remains in progress. Items needing further implementation/review include durable rate limiting, CSRF/origin protections, session lifecycle hardening, runtime compatibility, OTP delivery/cleanup reliability, automated tests and independent security review.

**Do not use this build for a real or binding election.** No audited secret-ballot protocol, cryptographic end-to-end verification or production-grade verifiable tally is implemented. Polygon alone does not guarantee ballot anonymity, integrity or legal compliance.

## Documentation
- [Product blueprint](docs/PRODUCT_BLUEPRINT.md)
- [Technical architecture](docs/TECHNICAL_ARCHITECTURE.md)
- [Security and privacy](docs/SECURITY_AND_PRIVACY.md)
- [Data model](docs/DATA_MODEL.md)
- [API blueprint](docs/API_BLUEPRINT.md)
- [Delivery roadmap](docs/DELIVERY_ROADMAP.md)
- [Implementation status](docs/IMPLEMENTATION_STATUS.md)
- [Cloudflare deployment](docs/CLOUDFLARE_DEPLOYMENT.md)
- [Codex preview setup](docs/CODEX_PREVIEW.md)

## Development branch
Current working branch: `blueprint/votachain-complete-blueprint`. The `main` branch is intentionally untouched during ongoing blueprint development.

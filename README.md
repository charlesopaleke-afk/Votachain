# VotaChain

**VotaChain** is a multi-organization election administration platform in early development.

> **Safety status:** This is not a production voting service, is not certified, and is not suitable for binding or high-stakes elections. The cryptographic ballot protocol, end-to-end verifiability, and independent security assessment are not implemented.

## Flat application structure

Application code and deployable entry points live at the repository root:
- `index.html` — single-page application shell.
- `client.js` — browser route handling and dashboard workflows.
- `styles.css` — application styles.
- `worker.js` — central Cloudflare Worker API router.
- `schema.sql` — PostgreSQL schema used by the Worker.
- `wrangler.jsonc` — Worker and static asset configuration.

Documentation remains under `docs/`. There are no nested frontend page or API route directories.

## Implemented API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Worker and database health |
| POST | `/api/auth/request-otp` | Send email sign-in code |
| POST | `/api/auth/verify-otp` | Verify code and create session |
| GET / DELETE | `/api/auth/session` | Read or clear session |
| GET / POST | `/api/organizations` | List or create organizations |
| GET / POST / PATCH | `/api/elections` | List, create and update elections |
| GET / POST / DELETE | `/api/candidates` | Candidate administration |
| GET / POST / DELETE | `/api/voters` | Voter register |
| POST | `/api/voters/import` | Batch import up to 500 voter emails |
| GET | `/api/audit` | Read organization audit events |

Protected endpoints require a signed HttpOnly session cookie. Organization-scoped writes require an owner, admin or election manager membership.

## Local development

Requires Node.js 20 or newer and npm.

```bash
npm install
cp .env.example .dev.vars
```

Update `.dev.vars` with a local PostgreSQL URL, Resend credentials, and independent JWT/OTP secrets. Do not commit this file.

Create the database tables:

```bash
psql "$DATABASE_URL" -f schema.sql
```

Start the Cloudflare Worker and static frontend:

```bash
npm run dev
```

Open the local URL printed by Wrangler. For frontend-only Vite iteration use `npm run dev:ui`; API calls require the Worker runtime.

## Cloudflare deployment

Create a Hyperdrive configuration using your PostgreSQL connection string:

```bash
npx wrangler hyperdrive create VotaChain-DB --connection-string="$DATABASE_URL"
```

Add the returned ID to `wrangler.jsonc`:

```json
"hyperdrive": [{ "binding": "HYPERDRIVE", "id": "YOUR_HYPERDRIVE_ID" }]
```

Set Worker secrets:

```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put OTP_SECRET
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put EMAIL_FROM
```

Then run `npm run preview` and `npm run deploy` after database migration and tests. Do not deploy until `/api/health`, authentication, organization creation, election lifecycle, voter/candidate management and bulk import have been tested.

## Security and product limitations

- OTP challenges expire after 10 minutes, enforce a 60-second per-email resend cooldown and allow at most five verification attempts.
- Authentication uses a seven-day HttpOnly, SameSite=Lax session cookie.
- Durable IP-based abuse throttling, CSRF tokens, session revocation, stronger election concurrency controls and independent security review remain outstanding.
- Polygon anchoring and a cryptographic secret-ballot protocol are not implemented. The Ballot table is not a functioning voting protocol.
- Do not use this build for a real or binding election.

Working branch: `blueprint/votachain-complete-blueprint`. The `main` branch remains untouched.

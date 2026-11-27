# Cloudflare deployment

## Active runtime

VotaChain now uses a flat single-page frontend and a central Cloudflare Worker:
- `index.html`, `client.js`, `styles.css`: frontend entry and browser application.
- `worker.js`: central API router.
- `schema.sql`: PostgreSQL schema.
- `wrangler.jsonc`: Worker entry point, compatibility and static asset binding.

The old Next.js/OpenNext route tree and configuration have been removed from the active branch.

## Database connection

The Worker uses Postgres.js with Cloudflare Hyperdrive. Create a Hyperdrive configuration using the PostgreSQL connection string held in your local environment:

```bash
npx wrangler hyperdrive create VotaChain-DB --connection-string="$DATABASE_URL"
```

Add the ID returned by Wrangler to `wrangler.jsonc`:

```json
"hyperdrive": [{ "binding": "HYPERDRIVE", "id": "YOUR_HYPERDRIVE_ID" }]
```

For local development, put `DATABASE_URL` in the ignored `.dev.vars` file instead.

## Secrets

Set these Worker secrets:
- `JWT_SECRET`: independent random secret, at least 32 characters.
- `OTP_SECRET`: a separate independent random secret, at least 32 characters.
- `RESEND_API_KEY`: Resend API credential.
- `EMAIL_FROM`: sender address verified by Resend.

Do not commit `.dev.vars`, production credentials or connection strings.

## Commands

```bash
npm install
npm run check
npm run build
npm run preview
```

Deploy only after database setup and functional testing:

```bash
npm run deploy
```

## Validation checklist

- `npm run check` validates JavaScript syntax.
- `npm run build` generates the Vite static frontend.
- `/api/health` must report a connected database.
- Test OTP request/verification, session/logout, organization creation, election lifecycle, voter/candidate CRUD and bulk import.
- Review Worker logs and test all cookie-authenticated mutations.
- Do not treat a successful frontend build as proof that the database, email delivery or voting protocol is production-ready.

A live Cloudflare deployment has not been performed as part of this migration.

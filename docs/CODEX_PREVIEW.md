# Codex preview setup

## Repository

Repository: https://github.com/charlesopaleke-afk/Votachain

Working branch: `blueprint/votachain-complete-blueprint`. Do not commit to `main` during blueprint work.

## Install and configure

```bash
npm install
cp .env.example .dev.vars
```

Set a local PostgreSQL connection string, Resend API key, verified sender, and separate random `JWT_SECRET` and `OTP_SECRET` values (at least 32 characters each). Keep `.dev.vars` private and uncommitted.

Create the schema in a development database:

```bash
psql "$DATABASE_URL" -f schema.sql
```

## Run and verify

```bash
npm run check
npm run build
npm run dev
```

Wrangler prints the local preview URL. The application uses one frontend entry and client-side navigation:
- `/login` — email OTP sign-in
- `/dashboard` — organization overview and election management
- `/voters` — voter register and bulk import
- `/candidates` — candidate management
- `/audit` — organization audit events

Check `/api/health` to confirm database connectivity.

## Limitations

The worker requires a PostgreSQL connection and Resend credentials for full use. The cryptographic ballot protocol, anonymous ballot submission, verifiable tally and Polygon anchoring are not implemented. Do not use this build for a real or binding election.

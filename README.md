# VotaChain

**VotaChain** is a multi-organization election administration platform in early development.

> **Safety status:** Not a production voting service, not certified, and not suitable for binding or high-stakes elections. The cryptographic ballot protocol, end-to-end verifiability and independent security assessment are not implemented.

## Architecture migration

The blueprint is moving from Next.js App Router to a flat Cloudflare Workers architecture:
- `index.html` — single frontend entry point.
- `client.js` — lightweight client-side path router.
- `styles.css` — application styles.
- `worker.js` — central Cloudflare request/API dispatcher.
- `wrangler.jsonc` — Worker and static asset configuration.
- `prisma/schema.prisma` — database schema retained during the API port.

The new root-level frontend shell is an initial migration milestone. Existing Next.js pages and API handlers are retained temporarily as reference/source during the port; they are not yet replaced by the Worker. Do not delete them until their behavior has been migrated and tested.

## Existing capability baseline
Organization membership, email OTP authentication, election lifecycle management, candidate administration, voter registration, bulk voter import and administrative audit events exist in the legacy Next.js implementation. They are not yet connected to the new flat Worker frontend.

The ballot protocol, cryptographic anonymous voting, end-to-end verifiability and Polygon anchoring are not implemented.

## Local development
Requires Node.js and npm.

```bash
npm install
npm run dev
```

Open the Vite development URL printed in the terminal.

Build and preview:
```bash
npm run build
npm run preview
```

Deploy only after the Worker API migration, database/runtime compatibility, security review and full route tests are complete:
```bash
npm run deploy
```

## Cloudflare
The Worker serves the built `dist/` assets. Configure production secrets and database connectivity using Cloudflare-supported bindings. Never commit credentials. Prisma/PostgreSQL connectivity and OTP delivery must be validated for the Workers runtime before production.

## Branch
Working branch: `blueprint/votachain-complete-blueprint`. The `main` branch is intentionally untouched.

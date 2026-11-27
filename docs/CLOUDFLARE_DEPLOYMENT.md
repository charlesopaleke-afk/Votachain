# Cloudflare deployment

## Configuration added
VotaChain now includes a starter OpenNext configuration for Cloudflare Workers:
- `wrangler.jsonc`: Worker entrypoint, compatibility settings, static assets binding, and observability.
- `open-next.config.ts`: OpenNext adapter configuration.
- `package.json`: preview, deploy, upload, and type-generation scripts.
- `.gitignore`: excludes adapter build output, Wrangler files, generated types, and local variables.

## Root and route discovery
- Keep Git repository root as the app root.
- Build watch paths should include the whole repository (Cloudflare default `*`); avoid exclusions.
- Next.js routes are nested under `app/`. **Do not flatten route folders.**
- Next.js route handlers and pages are discovered by convention.

## Commands
```bash
npm install
npm run preview
```
The preview command builds via OpenNext and runs a local Workers preview.

Deploy only after review:
```bash
npm run deploy
```
Upload a version without activating it:
```bash
npm run upload
```
Generate Worker environment typings:
```bash
npm run cf-typegen
```

## Secrets
Configure environment values using Cloudflare secrets/variables or local `.dev.vars` (ignored by git). Never commit secrets. Review all required values in `.env.example` and verify provider-specific access.

## Validation checklist
- Install dependencies and inspect dependency compatibility.
- Run the adapter preview build.
- Confirm Worker output, generated route manifest and assets.
- Test page routes and API routes individually.
- Validate Prisma/PostgreSQL connectivity, OTP email delivery, session cookies and API behavior under Workers runtime.
- Check security controls and limits.
- Only then deploy a preview Worker and conduct QA.

## Known limitation
Configuration is committed but **the adapter build and live Cloudflare deployment have not been run or verified**. Prisma/PostgreSQL runtime connectivity, secrets, and email delivery are not yet confirmed. This is not production election software.

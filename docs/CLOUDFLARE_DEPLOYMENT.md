# Cloudflare deployment and route discovery

## Architecture decision
VotaChain uses Next.js App Router. Its routes are represented by nested directories under `app/`; this directory structure is required by Next.js and is not something to flatten. Cloudflare must build the Next.js application through the OpenNext Cloudflare adapter so route handlers, server components and middleware/runtime features are bundled as supported.

## Build inclusion policy
- Git repository root is the application root; do not set a nested Pages root directory.
- Include all repository files in build watch paths (Cloudflare default include pattern `*`; no excludes) so changes in nested route folders trigger builds.
- Do not flatten `app/api/**/route.ts`, page routes or components: Next.js discovers route files by directory convention.
- Keep route code under `app/` and shared helpers in root `lib/`; all paths must be included by the build.
- Do not commit build output, `.env`, or secrets.

## Deployment migration checklist (before connecting Cloudflare)
1. Confirm target runtime: Cloudflare Workers using the OpenNext adapter for Next.js, rather than treating this as a static Pages export.
2. Install and pin a compatible `@opennextjs/cloudflare` version and Wrangler version after checking Cloudflare's current compatibility guidance.
3. Add adapter build/deploy scripts and a Wrangler configuration appropriate for the chosen Workers project.
4. Check Next.js features, Prisma runtime, email provider and PostgreSQL access against Cloudflare runtime compatibility. Database connectivity must be provisioned (for example, a compatible managed Postgres provider and supported connection strategy).
5. Configure secrets in Cloudflare dashboard or Wrangler secret storage; never in Git.
6. Build locally using the adapter, inspect generated worker assets and route manifest, test every route, then deploy a preview Worker before production.
7. Configure repository build watch paths to include all paths (default `*`) and exclude nothing.

## Route inventory (current)
- `/` landing
- `/login` OTP login
- `/dashboard` organization dashboard
- `/voters` voter administration and batch-import UI
- `/candidates` candidate administration
- API handlers: `/api/auth/request-otp`, `/api/auth/verify-otp`, `/api/auth/session`, `/api/organizations`, `/api/elections`, `/api/voters`, `/api/voters/import`, `/api/candidates`

## Important
This repository is not yet adapter-configured, built or deployed on Cloudflare. The checklist is a deployment target plan, not a claim that the project already deploys successfully.

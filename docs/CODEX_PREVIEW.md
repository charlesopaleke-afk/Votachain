# Codex preview setup

Use this guide to open and run the current VotaChain blueprint branch in a Codex coding workspace.

## 1. Open the repository

Open the GitHub repository in Codex:
https://github.com/charlesopaleke-afk/Votachain

Check out this branch (do not switch to or commit on main):
`blueprint/votachain-complete-blueprint`

## 2. Install dependencies

```bash
npm install
npx prisma generate
```

## 3. Configure environment

Copy `.env.example` to `.env` and configure the values. A PostgreSQL database is required for the authenticated dashboard and voter/candidate APIs.

Required values:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: at least 32 characters of high-entropy random data
- `OTP_SECRET`: a separate, independent secret of at least 32 characters
- `RESEND_API_KEY`: Resend API key for OTP email delivery
- `EMAIL_FROM`: sender identity verified with Resend
- `APP_URL`: local preview origin, usually `http://localhost:3000`

Never commit real secrets or production database credentials.

For a disposable development database, apply the current Prisma schema with:

```bash
npx prisma db push
```

Use reviewed migrations rather than `db push` for production.

## 4. Start the preview

```bash
npm run dev
```

Open:
- `http://localhost:3000` — landing page
- `http://localhost:3000/login` — email OTP sign-in
- `http://localhost:3000/dashboard` — organization/election dashboard
- `http://localhost:3000/voters` — voter register

## 5. Ask Codex to inspect before changing

Suggested Codex task:

> Inspect the current VotaChain branch and get the app running locally. Do not merge into main. Do not invent database records or claim production readiness. Check Prisma generation, TypeScript/Next.js build, and API behavior. Report missing environment configuration clearly. Preserve the existing design and only make changes on blueprint/votachain-complete-blueprint.

## Current preview limitations

- PostgreSQL and Resend configuration are needed for full sign-in and persisted data.
- Candidate API exists; candidate management UI is not yet implemented.
- CSV import and voter invitation/OTP eligibility are not implemented.
- No cryptographic secret-ballot protocol or verifiable tally is implemented. Do not use this build for binding elections.
- No successful local build or database integration test is claimed by this guide.

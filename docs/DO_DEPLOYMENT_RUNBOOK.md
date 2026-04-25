# DigitalOcean Deployment Runbook (Kyzer)

This runbook deploys the Vite frontend to DigitalOcean App Platform while keeping Supabase as backend (Auth/DB/Storage).

## 1) Pre-flight checks

- Ensure `main` contains all required Supabase migrations.
- Verify local build passes:
  - `npm ci`
  - `npm run build`
- Confirm production environment values are ready:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_APP_URL` (final HTTPS URL)

## 2) App Platform setup

- In DigitalOcean, create app from GitHub repo.
- Choose `main` branch (or your release branch).
- Use static site settings:
  - Build command: `npm ci && npm run build`
  - Output directory: `dist`
  - SPA fallback: `index.html` as catch-all
- Optional: import and customize `.do/app.yaml`.

## 3) Environment variables

Set these in DigitalOcean App settings:

- `VITE_SUPABASE_URL` (secret)
- `VITE_SUPABASE_ANON_KEY` (secret)
- `VITE_APP_URL` (plain)
- `NODE_VERSION=20` (plain)

Important:
- `VITE_*` values are embedded at build time.
- Redeploy after changing any `VITE_*` variable.

## 4) Supabase production config

In Supabase Auth settings:

- Set Site URL to `https://your-domain.com`
- Add redirect URL(s):
  - `https://your-domain.com/auth/callback`
  - any additional preview URL if needed

In database:

- Apply migrations in order from `supabase/migrations`.
- Do not delete historical migrations for active environments.

## 5) DNS and TLS

- Point domain DNS records to App Platform.
- Enable managed HTTPS certificate.
- Verify HTTPS works and HTTP redirects to HTTPS.

## 6) Post-deploy smoke tests

- Public routes:
  - `/`
  - `/pricing`
  - `/contact`
- Auth:
  - login/signup
  - password reset
  - callback at `/auth/callback`
- App routes:
  - `/app/dashboard`
  - `/app/courses`
- Corporate routes:
  - `/company/dashboard`
  - permission-gated pages load correctly
- Share links:
  - course share preview
  - certificate share page

## 7) Rollback strategy

- Keep last known good commit tagged (example: `prod-YYYYMMDD-HHMM`).
- If release fails:
  - redeploy previous commit in App Platform
  - verify smoke tests
- If migration caused issue:
  - create forward-fix migration (do not edit old applied migration files)

## 8) Operational checklist

- Monitor App Platform deploy logs on each release.
- Enable basic alerts for deploy failures.
- Keep secrets in DO env vars only; never in repository.
- Run a quick smoke test after every production deploy.

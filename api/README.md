# API Service

Minimal Express API for DigitalOcean deployments.

## Endpoints

- `GET /api/health`
- `GET /api/courses/:courseId/share-preview`
- `GET /api/certificates/:shareToken`
- `POST /api/auth/check-email` with body `{ "email": "user@example.com" }`
- `POST /api/certificates/:certificateId/share-token` (requires `Authorization: Bearer <access_token>`)
- `POST /api/corporate/send-invitation-email` with body `{ email, data }`
- `POST /api/corporate/create-user-direct` (requires `Authorization: Bearer <access_token>`)
- `POST /api/corporate/refresh-members-cache` with body `{ orgId }` (requires `Authorization: Bearer <access_token>`)

## Environment Variables

- `PORT` (optional, default `8080`)
- `CORS_ORIGIN` (optional, default `*`)
- `SUPABASE_URL` (or `VITE_SUPABASE_URL`)
- `SUPABASE_ANON_KEY` (or `VITE_SUPABASE_ANON_KEY`)
- `SUPABASE_SERVICE_ROLE_KEY`

## Run

- `npm run dev:api` for local development
- `npm run start:api` for production runtime

## Notes

- `SUPABASE_SERVICE_ROLE_KEY` must stay server-side only.
- If dependencies are not installed yet, run `npm install` locally.

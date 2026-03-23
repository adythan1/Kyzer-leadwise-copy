# Stripe checkout (Edge Functions)

## Frontend: Price IDs (`VITE_STRIPE_PRICE_*`)

The Pricing page maps each plan to a Stripe **Price** ID via environment variables (see `.env.example`). If a variable is missing, checkout is disabled for that plan and the UI shows **Billing not configured**.

Example for Team monthly:

```bash
VITE_STRIPE_PRICE_TEAM_MONTHLY=price_xxxxxxxx
```

After editing `.env`, restart Vite (`npm run dev`). Use **test** mode Price IDs with a test publishable key.

### Vercel warning about `VITE_*` and `KEY`

Any `VITE_` variable is included in the **client** bundle. Vercel may warn if the name contains `KEY`. That is appropriate for **secrets**; Stripe’s **publishable** key (`pk_...`) is **meant to be public** (restrict abuse in Stripe Dashboard with allowed domains if needed). Never add `STRIPE_SECRET_KEY` / `sk_...` as a `VITE_` variable.

To reduce the warning, use **`VITE_STRIPE_PUBLISHABLE`** (supported in code) instead of `VITE_STRIPE_PUBLISHABLE_KEY`.

## Deploy

From the repo root, with [Supabase CLI](https://supabase.com/docs/guides/cli) logged in and linked to your project:

```bash
# Required secret for checkout + verification
supabase secrets set STRIPE_SECRET_KEY=sk_live_...

# Optional: used in checkout URLs if the client does not send success/cancel URLs
supabase secrets set VITE_APP_URL=https://your-production-domain.com

supabase functions deploy create-checkout-session
supabase functions deploy verify-checkout-session
```

For **webhooks** (updating `subscription_plan` / org status), deploy `stripe-webhook` separately and register the URL in the Stripe Dashboard.

## “CORS error” / “Failed to send a request to the Edge Function”

Common causes:

1. **Function not deployed** to the project your app uses (`VITE_SUPABASE_URL`). The browser then gets a gateway response without CORS headers → DevTools shows a CORS error.
2. **Preflight** missing `Access-Control-Allow-Methods` or extra request headers. This repo’s functions use `supabase/functions/_shared/cors.ts` to align with `supabase.functions.invoke()`.
3. **Not signed in** (if JWT verification is on): fix by logging in again; ensure the anon key in `.env` matches the same Supabase project.

After changing CORS or function code, **redeploy** the function.

## Local testing

```bash
supabase functions serve create-checkout-session --env-file ./supabase/.env.local
```

Point the app at local Supabase only when intentionally testing against local functions.

# Stripe production fix — live mode on Digital Ocean

Use this runbook when production (`myleadwiseacademy.com`) returns
`No such price: 'price_…'` from `/functions/v1/create-checkout-session`.

The error means: the Stripe **secret key** bound to the Edge Function does not
recognize the Price ID being sent from the browser. There are only three
possible causes:

1. Test vs live mode mismatch between the frontend (`VITE_STRIPE_*`) and the
   Supabase secret (`STRIPE_SECRET_KEY`).
2. Different Stripe accounts on either side (correct mode, wrong account).
3. The Price IDs simply do not exist in the Stripe account that owns the
   secret key (typical when switching to live mode for the first time).

This runbook assumes you want production on **live mode** in account
`acct_1TSPd8BcKyhAprnB` (the one whose `sk_live_…KyhAprnB…` key you already
have access to).

---

## 0. Prerequisites

- Stripe Dashboard access for the live account.
- Supabase CLI logged in and linked to project `qdppguagqxmmllxmdlpi`.
- Access to the Digital Ocean build environment variables for the app.

---

## 1. Create products + prices in **live** Stripe

In the Stripe Dashboard, top-right toggle must read **Live mode** (not Test
mode). For each plan below, create **one product** with **two recurring
prices** (monthly + annual). The exact unit amounts come from
`src/pages/public/Pricing.jsx`.

| Product   | Monthly (USD) | Annual (USD) | Env var (monthly)                  | Env var (annual)                   |
|-----------|--------------:|-------------:|------------------------------------|------------------------------------|
| Starter   | 9             | 90           | `VITE_STRIPE_PRICE_STARTER_MONTHLY`| `VITE_STRIPE_PRICE_STARTER_ANNUAL` |
| Pro       | 29            | 290          | `VITE_STRIPE_PRICE_PRO_MONTHLY`    | `VITE_STRIPE_PRICE_PRO_ANNUAL`     |
| Premium   | 99            | 990          | `VITE_STRIPE_PRICE_PREMIUM_MONTHLY`| `VITE_STRIPE_PRICE_PREMIUM_ANNUAL` |
| Team      | 15 / seat     | 150 / seat   | `VITE_STRIPE_PRICE_TEAM_MONTHLY`   | `VITE_STRIPE_PRICE_TEAM_ANNUAL`    |
| Business  | (your value)  | (your value) | `VITE_STRIPE_PRICE_BUSINESS_MONTHLY`| `VITE_STRIPE_PRICE_BUSINESS_ANNUAL`|

For each price, copy the **Price ID** (starts with `price_…`, **not**
`prod_…`) from the product's **Pricing** table.

---

## 2. Set the Supabase secret in **live** mode

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_…KyhAprnB…
supabase secrets set VITE_APP_URL=https://myleadwiseacademy.com

supabase functions deploy create-checkout-session
supabase functions deploy verify-checkout-session
```

The function now returns `secretKeyMode` in its error payload — so if you ever
hit this issue again, the toast will explicitly say `Supabase secret is in
LIVE mode` (or `TEST`), no shell access needed.

---

## 3. Set Digital Ocean build env vars

On the Digital Ocean app (App Platform → app → Settings → App-Level
Environment Variables, or the equivalent build env for your droplet),
set:

```
VITE_STRIPE_PUBLISHABLE=pk_live_…KyhAprnB…

VITE_STRIPE_PRICE_STARTER_MONTHLY=price_…
VITE_STRIPE_PRICE_STARTER_ANNUAL=price_…
VITE_STRIPE_PRICE_PRO_MONTHLY=price_…
VITE_STRIPE_PRICE_PRO_ANNUAL=price_…
VITE_STRIPE_PRICE_PREMIUM_MONTHLY=price_…
VITE_STRIPE_PRICE_PREMIUM_ANNUAL=price_…
VITE_STRIPE_PRICE_TEAM_MONTHLY=price_…
VITE_STRIPE_PRICE_TEAM_ANNUAL=price_…
VITE_STRIPE_PRICE_BUSINESS_MONTHLY=price_…
VITE_STRIPE_PRICE_BUSINESS_ANNUAL=price_…
```

All values must come from the **live** Stripe account from step 1.

**Trigger a rebuild** after saving. `VITE_*` are inlined at build time —
runtime env changes alone do nothing.

---

## 4. Verify

After the new build is live:

1. Open `https://myleadwiseacademy.com/pricing`.
2. DevTools Console → check the publishable key mode is `live`:
   ```js
   document.documentElement.outerHTML.match(/pk_(live|test)_/)?.[0]
   ```
   Expect `pk_live_`.
3. Click any plan. You should be redirected to a Stripe Checkout page on
   `checkout.stripe.com`. No 500 from `create-checkout-session`.

If you still get `No such price`, copy the new toast — it now includes the
attempted `priceId` and Supabase secret mode, e.g.:

> `No such price: 'price_X' — Supabase secret is in LIVE mode, attempted
> priceId="price_X". …`

That tells you exactly which side is wrong:

- Mode mismatch (TEST/LIVE differ) → fix the side that's in the wrong mode.
- Same mode, still missing → the price ID isn't in the account the secret key
  belongs to. Recreate it in the correct account.

Sanity check from a terminal:

```bash
curl https://api.stripe.com/v1/prices/<PRICE_ID> -u "<STRIPE_SECRET_KEY>:"
```

A `200` with the price object means that secret key can see that price. A
`resource_missing` means it cannot — the two are not in the same account.

---

## 5. Webhooks (do this once you're live)

Deploy `stripe-webhook` and register the URL in the Stripe Dashboard
(**Developers → Webhooks**) for the same live account. Required events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_…
supabase functions deploy stripe-webhook
```

Without the webhook, Checkout will still complete, but `subscription_plan`
in the database will only update via the client-side `verify-checkout-session`
fallback — fragile if the user closes the tab.

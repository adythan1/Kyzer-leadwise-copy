import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno"
import { corsHeaders, corsPreflightResponse } from "../_shared/cors.ts"

// Stripe secret keys look like `sk_test_...` or `sk_live_...`. Surfacing the mode
// (without the secret) in the error response makes test/live mismatches obvious.
const stripeKeyMode = (key: string | undefined): 'test' | 'live' | 'unknown' => {
  if (!key) return 'unknown'
  if (key.startsWith('sk_test_')) return 'test'
  if (key.startsWith('sk_live_')) return 'live'
  return 'unknown'
}

let bodyForErrorContext: Record<string, unknown> = {}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse()
  }

  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
  const secretKeyMode = stripeKeyMode(stripeSecretKey)

  try {
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured')
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    })

    const requestBody = await req.json()
    bodyForErrorContext = requestBody || {}
    const { priceId, quantity, customerEmail, userId, planName, planType, successUrl, cancelUrl } = requestBody

    if (!priceId) {
      return new Response(
        JSON.stringify({ error: 'Missing priceId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const parsedQuantity = Number(quantity)
    const safeQuantity = Number.isFinite(parsedQuantity)
      ? Math.max(1, Math.floor(parsedQuantity))
      : 1

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: safeQuantity }],
      success_url: successUrl || `${Deno.env.get('VITE_APP_URL') || 'http://localhost:5173'}/pricing?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: cancelUrl || `${Deno.env.get('VITE_APP_URL') || 'http://localhost:5173'}/pricing?status=cancelled`,
      metadata: {
        userId: userId || '',
        planName: planName || '',
        planType: planType || 'individual',
        quantity: String(safeQuantity),
      },
    }

    if (customerEmail) {
      sessionParams.customer_email = customerEmail
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    // Stripe errors carry `code`, `type`, `param`, and a `requestId` we want to
    // forward so debugging from the browser (or logs) doesn't require shell access.
    const stripeErr = error as {
      message?: string
      code?: string
      type?: string
      param?: string
      statusCode?: number
      requestId?: string
    }

    const message = stripeErr?.message || 'Unknown error'
    const attemptedPriceId =
      typeof bodyForErrorContext?.priceId === 'string'
        ? bodyForErrorContext.priceId
        : undefined

    console.error('Error creating checkout session', {
      message,
      code: stripeErr?.code,
      type: stripeErr?.type,
      param: stripeErr?.param,
      requestId: stripeErr?.requestId,
      secretKeyMode,
      attemptedPriceId,
    })

    return new Response(
      JSON.stringify({
        error: message,
        code: stripeErr?.code,
        type: stripeErr?.type,
        param: stripeErr?.param,
        stripeRequestId: stripeErr?.requestId,
        secretKeyMode,
        attemptedPriceId,
      }),
      {
        status: stripeErr?.statusCode && stripeErr.statusCode >= 400 ? stripeErr.statusCode : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

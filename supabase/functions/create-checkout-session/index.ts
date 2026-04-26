import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno"
import { corsHeaders, corsPreflightResponse } from "../_shared/cors.ts"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse()
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured')
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    })

    const { priceId, quantity, customerEmail, userId, planName, planType, successUrl, cancelUrl } = await req.json()

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
    console.error('Error creating checkout session:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

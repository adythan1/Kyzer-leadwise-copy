import { loadStripe } from '@stripe/stripe-js'
import { supabase } from '@/lib/supabase'

let stripePromise = null

export const getStripe = () => {
  if (!stripePromise) {
    // Prefer VITE_STRIPE_PUBLISHABLE (no "KEY" in name) — some hosts (e.g. Vercel) warn on VITE_* + KEY.
    // Value is still Stripe's publishable key pk_... which is safe to expose in the browser.
    const key =
      import.meta.env.VITE_STRIPE_PUBLISHABLE || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
    if (!key) {
      throw new Error(
        'Missing VITE_STRIPE_PUBLISHABLE (or legacy VITE_STRIPE_PUBLISHABLE_KEY) environment variable'
      )
    }
    stripePromise = loadStripe(key)
  }
  return stripePromise
}

/**
 * Redirect the current user to a Stripe Checkout session for the given price.
 * The Supabase Edge Function `create-checkout-session` creates the session
 * server-side using the Stripe secret key, then returns the session URL.
 *
 * @param {string} priceId - Stripe price ID
 * @param {string} planName - Plan name (starter, pro, premium, team, business)
 * @param {string} planType - Plan type (individual or corporate)
 */
export const redirectToCheckout = async (priceId, planName = '', planType = 'individual') => {
  const { data: { session } } = await supabase.auth.getSession()

  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: {
      priceId,
      customerEmail: session?.user?.email,
      userId: session?.user?.id,
      planName,
      planType,
      successUrl: `${window.location.origin}/pricing?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancelUrl: `${window.location.origin}/pricing?status=cancelled`
    }
  })

  if (error) {
    const raw = error.message || ''
    if (
      raw.includes('Failed to send a request to the Edge Function') ||
      raw.includes('Edge Function') ||
      raw.includes('CORS')
    ) {
      throw new Error(
        'Checkout could not reach the server. Redeploy the create-checkout-session Edge Function, set STRIPE_SECRET_KEY in Supabase secrets, and use the same project as VITE_SUPABASE_URL. See docs/STRIPE_CHECKOUT.md.'
      )
    }
    throw new Error(raw || 'Failed to create checkout session')
  }

  if (data?.url) {
    window.location.href = data.url
    return
  }

  const stripe = await getStripe()
  if (data?.sessionId) {
    const { error: stripeError } = await stripe.redirectToCheckout({
      sessionId: data.sessionId
    })
    if (stripeError) {
      throw new Error(stripeError.message)
    }
  }
}

/**
 * Verify a completed checkout session and update the user's subscription.
 * Called client-side as a fallback when the user returns from Stripe.
 */
export const verifyCheckoutSession = async (sessionId) => {
  const { data, error } = await supabase.functions.invoke('verify-checkout-session', {
    body: { sessionId }
  })

  if (error) {
    const raw = error.message || ''
    if (
      raw.includes('Failed to send a request to the Edge Function') ||
      raw.includes('Edge Function') ||
      raw.includes('CORS')
    ) {
      throw new Error(
        'Could not verify checkout. Redeploy verify-checkout-session and check Supabase secrets. See docs/STRIPE_CHECKOUT.md.'
      )
    }
    throw new Error(raw || 'Failed to verify checkout session')
  }

  return data
}

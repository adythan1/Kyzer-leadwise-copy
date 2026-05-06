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

// Translate a supabase.functions.invoke() error into a user-friendly Error.
// Distinguishes a true "function unreachable" failure from a function that
// ran but returned a non-2xx response, so we surface the actual server message
// (e.g. Stripe's "No such price: ...") instead of a generic redeploy hint.
const parseInvokeError = async (error, unreachableMessage) => {
  const name = error?.name || ''

  if (name === 'FunctionsFetchError') {
    return new Error(unreachableMessage)
  }

  if (name === 'FunctionsHttpError' || name === 'FunctionsRelayError') {
    const response = error.context
    if (response && typeof response.clone === 'function') {
      try {
        const body = await response.clone().json()
        const serverMessage =
          (typeof body?.error === 'string' && body.error) ||
          (typeof body?.message === 'string' && body.message) ||
          ''
        if (serverMessage) {
          return new Error(serverMessage)
        }
      } catch {
        try {
          const text = await response.clone().text()
          if (text) return new Error(text)
        } catch {
          // fall through to default
        }
      }
    }
    return new Error(error.message || 'Edge Function returned an error')
  }

  return new Error(error?.message || 'Unknown error invoking Edge Function')
}

/**
 * Redirect the current user to a Stripe Checkout session for the given price.
 * The Supabase Edge Function `create-checkout-session` creates the session
 * server-side using the Stripe secret key, then returns the session URL.
 *
 * @param {string} priceId - Stripe price ID
 * @param {string} planName - Plan name (starter, pro, premium, team, business)
 * @param {string} planType - Plan type (individual or corporate)
 * @param {number} quantity - Checkout quantity (used for tiered seat pricing)
 */
export const redirectToCheckout = async (
  priceId,
  planName = '',
  planType = 'individual',
  quantity = 1
) => {
  const { data: { session } } = await supabase.auth.getSession()
  const safeQuantity = Number.isFinite(Number(quantity)) ? Math.max(1, Math.floor(Number(quantity))) : 1

  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: {
      priceId,
      quantity: safeQuantity,
      customerEmail: session?.user?.email,
      userId: session?.user?.id,
      planName,
      planType,
      successUrl: `${window.location.origin}/pricing?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancelUrl: `${window.location.origin}/pricing?status=cancelled`
    }
  })

  if (error) {
    throw await parseInvokeError(
      error,
      'Checkout could not reach the server. Redeploy the create-checkout-session Edge Function, set STRIPE_SECRET_KEY in Supabase secrets, and use the same project as VITE_SUPABASE_URL. See docs/STRIPE_CHECKOUT.md.'
    )
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
    throw await parseInvokeError(
      error,
      'Could not verify checkout. Redeploy verify-checkout-session and check Supabase secrets. See docs/STRIPE_CHECKOUT.md.'
    )
  }

  return data
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const PRICE_TO_PLAN: Record<string, { plan: string; type: "individual" | "corporate" }> = {}

function buildPriceMap() {
  const mappings = [
    { env: "STRIPE_PRICE_STARTER_MONTHLY", plan: "starter", type: "individual" as const },
    { env: "STRIPE_PRICE_STARTER_ANNUAL", plan: "starter", type: "individual" as const },
    { env: "STRIPE_PRICE_PRO_MONTHLY", plan: "pro", type: "individual" as const },
    { env: "STRIPE_PRICE_PRO_ANNUAL", plan: "pro", type: "individual" as const },
    { env: "STRIPE_PRICE_PREMIUM_MONTHLY", plan: "premium", type: "individual" as const },
    { env: "STRIPE_PRICE_PREMIUM_ANNUAL", plan: "premium", type: "individual" as const },
    { env: "STRIPE_PRICE_TEAM_MONTHLY", plan: "team", type: "corporate" as const },
    { env: "STRIPE_PRICE_TEAM_ANNUAL", plan: "team", type: "corporate" as const },
    { env: "STRIPE_PRICE_BUSINESS_MONTHLY", plan: "business", type: "corporate" as const },
    { env: "STRIPE_PRICE_BUSINESS_ANNUAL", plan: "business", type: "corporate" as const },
  ]

  for (const { env, plan, type } of mappings) {
    const priceId = Deno.env.get(env)
    if (priceId) {
      PRICE_TO_PLAN[priceId] = { plan, type }
    }
  }
}

serve(async (req) => {
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!stripeSecretKey || !webhookSecret || !supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: "Missing required environment variables" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }

  buildPriceMap()

  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" })
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const body = await req.text()
  const signature = req.headers.get("stripe-signature")

  if (!signature) {
    return new Response(
      JSON.stringify({ error: "Missing stripe-signature header" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message)
    return new Response(
      JSON.stringify({ error: "Invalid signature" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.userId
    const planName = session.metadata?.planName
    const planType = session.metadata?.planType

    if (!userId) {
      console.error("No userId in session metadata")
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Resolve plan from metadata or from the price ID
    let resolvedPlan = planName
    let resolvedType = planType

    if (!resolvedPlan && session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string
      )
      const priceId = subscription.items.data[0]?.price?.id
      if (priceId && PRICE_TO_PLAN[priceId]) {
        resolvedPlan = PRICE_TO_PLAN[priceId].plan
        resolvedType = PRICE_TO_PLAN[priceId].type
      }
    }

    if (!resolvedPlan) {
      console.error("Could not resolve plan for session:", session.id)
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (resolvedType === "corporate") {
      // Corporate plan: update the organization's subscription_status
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", userId)
        .single()

      if (profile?.organization_id) {
        const { error: orgError } = await supabase
          .from("organizations")
          .update({ subscription_status: "active" })
          .eq("id", profile.organization_id)

        if (orgError) {
          console.error("Failed to update organization subscription:", orgError)
        }
      }
    } else {
      // Individual plan: update the profile's subscription_plan
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ subscription_plan: resolvedPlan })
        .eq("id", userId)

      if (profileError) {
        console.error("Failed to update profile subscription:", profileError)
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
})

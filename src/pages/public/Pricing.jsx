// src/pages/public/Pricing.jsx
import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { 
  Check, 
  X, 
  Star,
  Users,
  Building2,
  Crown,
  ArrowRight,
  Shield,
  Zap,
  HeadphonesIcon,
  Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import PageTitle from '@/components/layout/PageTitle'
import { redirectToCheckout, verifyCheckoutSession } from '@/services/stripe'
import { useAuth } from '@/hooks/auth/useAuth'

const STRIPE_PRICES = {
  starter_monthly: import.meta.env.VITE_STRIPE_PRICE_STARTER_MONTHLY,
  starter_annual: import.meta.env.VITE_STRIPE_PRICE_STARTER_ANNUAL,
  pro_monthly: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY,
  pro_annual: import.meta.env.VITE_STRIPE_PRICE_PRO_ANNUAL,
  premium_monthly: import.meta.env.VITE_STRIPE_PRICE_PREMIUM_MONTHLY,
  premium_annual: import.meta.env.VITE_STRIPE_PRICE_PREMIUM_ANNUAL,
  team_monthly: import.meta.env.VITE_STRIPE_PRICE_TEAM_MONTHLY,
  team_annual: import.meta.env.VITE_STRIPE_PRICE_TEAM_ANNUAL,
  business_monthly: import.meta.env.VITE_STRIPE_PRICE_BUSINESS_MONTHLY,
  business_annual: import.meta.env.VITE_STRIPE_PRICE_BUSINESS_ANNUAL,
}

/** Env variable name for a plan key, e.g. team_monthly → VITE_STRIPE_PRICE_TEAM_MONTHLY */
function stripePriceEnvVarName(stripePriceKey) {
  return `VITE_STRIPE_PRICE_${String(stripePriceKey).toUpperCase()}`
}

/**
 * Checkout line_items require a Stripe Price id (price_...).
 * Product ids (prod_...) look valid in .env but will fail at Stripe — common mix-up.
 */
function isConfiguredStripePriceId(raw) {
  if (raw === undefined || raw === null) return false
  const s = String(raw).trim()
  return s.length > 0 && s.startsWith('price_')
}

/** 'missing' | 'invalid' | 'ok' */
function stripePriceConfigState(stripePriceKey) {
  const raw = STRIPE_PRICES[stripePriceKey]
  if (raw === undefined || raw === null || !String(raw).trim()) return 'missing'
  if (!isConfiguredStripePriceId(raw)) return 'invalid'
  return 'ok'
}

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [audience, setAudience] = useState('individual')
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const { refreshUser } = useAuth()

  useEffect(() => {
    const status = searchParams.get('status')
    const sessionId = searchParams.get('session_id')

    if (status === 'success' && sessionId) {
      verifyCheckoutSession(sessionId)
        .then(async (result) => {
          await refreshUser()
          toast.success(`Payment successful! You're now on the ${result.plan} plan.`)
        })
        .catch(() => {
          toast.success('Payment successful! Your plan will update shortly.')
        })
        .finally(() => {
          setSearchParams({}, { replace: true })
        })
    } else if (status === 'cancelled') {
      toast('Checkout was cancelled.', { icon: 'ℹ️' })
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, refreshUser, setSearchParams])

  const resolvePlanInfo = (stripePriceKey) => {
    const parts = stripePriceKey.split('_')
    const planName = parts[0]
    const corporatePlans = ['team', 'business']
    const planType = corporatePlans.includes(planName) ? 'corporate' : 'individual'
    return { planName, planType }
  }

  const priceConfigSummary = (() => {
    const entries = Object.entries(STRIPE_PRICES);
    const missing = entries
      .filter(([key]) => stripePriceConfigState(key) === 'missing')
      .map(([key]) => stripePriceEnvVarName(key));
    const invalid = entries
      .filter(([key]) => stripePriceConfigState(key) === 'invalid')
      .map(([key]) => stripePriceEnvVarName(key));
    return { missing, invalid };
  })();

  const handleSubscribe = async (stripePriceKey, options = {}) => {
    const priceId = STRIPE_PRICES[stripePriceKey]
    const envName = stripePriceEnvVarName(stripePriceKey)
    if (!priceId || !String(priceId).trim()) {
      toast.error(
        `Add ${envName}=price_... in Vercel (project) env and redeploy. Team/Business use TEAM_MONTHLY / BUSINESS_MONTHLY, not STARTER_* only.`
      )
      return
    }
    if (!isConfiguredStripePriceId(priceId)) {
      toast.error(
        `${envName} must be a Stripe Price ID (starts with price_), not a Product ID (prod_). Copy it from Stripe → Product → Pricing table.`
      )
      return
    }

    const { planName, planType } = resolvePlanInfo(stripePriceKey)
    const quantity = Number.isFinite(Number(options.quantity))
      ? Math.max(1, Math.floor(Number(options.quantity)))
      : 1

    setLoadingPlan(stripePriceKey)
    try {
      await redirectToCheckout(priceId, planName, planType, quantity)
    } catch (error) {
      toast.error(error.message || 'Something went wrong. Please try again.')
    } finally {
      setLoadingPlan(null)
    }
  }

  const individualPlans = [
    {
      name: "Starter",
      price: billingCycle === 'monthly' ? 9 : 90,
      originalPrice: billingCycle === 'annual' ? 108 : null,
      description: "Perfect for getting started with learning",
      stripePriceKey: billingCycle === 'monthly' ? 'starter_monthly' : 'starter_annual',
      features: [
        "Access to 50+ courses",
        "Basic progress tracking",
        "Community forums",
        "Mobile app access",
        "Certificate of completion"
      ],
      limitations: [
        "No offline access",
        "Basic support only"
      ],
      cta: "Get Started",
      popular: false,
      icon: Star
    },
    {
      name: "Pro",
      price: billingCycle === 'monthly' ? 29 : 290,
      originalPrice: billingCycle === 'annual' ? 348 : null,
      description: "Unlock your full learning potential",
      stripePriceKey: billingCycle === 'monthly' ? 'pro_monthly' : 'pro_annual',
      features: [
        "Unlimited access to 1000+ courses",
        "Advanced progress analytics",
        "Offline course downloads",
        "Priority support",
        "Personalized learning paths",
        "Skills assessments",
        "Project-based learning",
        "1-on-1 mentoring sessions (2/month)"
      ],
      limitations: [],
      cta: "Start Pro Trial",
      popular: true,
      icon: Zap
    },
    {
      name: "Premium",
      price: billingCycle === 'monthly' ? 99 : 990,
      originalPrice: billingCycle === 'annual' ? 1188 : null,
      description: "For serious professionals and experts",
      stripePriceKey: billingCycle === 'monthly' ? 'premium_monthly' : 'premium_annual',
      features: [
        "Everything in Pro",
        "Expert-led live sessions",
        "Custom learning tracks",
        "Industry certifications",
        "Career coaching sessions",
        "Networking events",
        "Beta access to new features",
        "White-glove onboarding"
      ],
      limitations: [],
      cta: "Go Premium",
      popular: false,
      icon: Crown
    }
  ]

  const corporatePlans = [
    {
      name: "Team",
      price: billingCycle === 'monthly' ? 15 : 150,
      originalPrice: billingCycle === 'annual' ? 180 : null,
      description: "Perfect for small teams and startups",
      userRange: "5-50 users",
      checkoutQuantity: 5,
      stripePriceKey: billingCycle === 'monthly' ? 'team_monthly' : 'team_annual',
      features: [
        "All Pro features for team members",
        "Team progress dashboard",
        "Basic admin controls",
        "Course assignments",
        "Team reporting",
        "Email support",
        "SSO integration"
      ],
      limitations: [
        "Limited to 50 employees",
        "Basic reporting only"
      ],
      cta: "Start Team Trial",
      popular: false,
      icon: Users
    },
    {
      name: "Business", 
      price: billingCycle === 'monthly' ? 25 : 250,
      originalPrice: billingCycle === 'annual' ? 300 : null,
      description: "Advanced features for growing companies",
      userRange: "50-200 users",
      checkoutQuantity: 50,
      stripePriceKey: billingCycle === 'monthly' ? 'business_monthly' : 'business_annual',
      features: [
        "Everything in Team",
        "Advanced analytics & reporting",
        "Custom branding",
        "Department management",
        "Mandatory course assignments",
        "Compliance tracking",
        "API access",
        "Priority support",
        "Custom integrations"
      ],
      limitations: [],
      cta: "Start Business Trial",
      popular: true,
      icon: Building2
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "Tailored solutions for large organizations",
      userRange: "200+ users",
      features: [
        "Everything in Business",
        "Custom development",
        "Dedicated account manager",
        "Advanced security controls",
        "Custom reporting",
        "Unlimited integrations",
        "24/7 phone support",
        "On-premise deployment option",
        "SLA guarantee"
      ],
      limitations: [],
      cta: "Contact Sales",
      popular: false,
      icon: Shield
    }
  ]

  const PlanCard = ({ plan, type = 'individual' }) => {
    const Icon = plan.icon
    const isEnterprise = plan.price === 'Custom'
    const isLoading = loadingPlan === plan.stripePriceKey
    const priceState = isEnterprise ? 'ok' : stripePriceConfigState(plan.stripePriceKey)
    const hasStripePriceId = priceState === 'ok'

    const handleClick = () => {
      if (isEnterprise) return
      handleSubscribe(plan.stripePriceKey, {
        quantity: type === 'corporate' ? (plan.checkoutQuantity || 1) : 1
      })
    }
    
    return (
      <Card
        className={`relative overflow-hidden p-6 sm:p-8 ${
          plan.popular
            ? 'ring-2 ring-primary shadow-xl shadow-primary/20 md:scale-105 bg-gradient-to-br from-primary-light/40 via-background-white to-primary/10'
            : ''
        }`}
      >
        {plan.popular && (
          <div
            aria-label="Most popular plan"
            className="pointer-events-none absolute -right-12 top-6 rotate-45 bg-primary text-white text-[11px] font-bold uppercase tracking-wider px-14 py-1 shadow-md"
          >
            Most Popular
          </div>
        )}

        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              plan.popular ? 'bg-primary text-white' : 'bg-background-light text-primary'
            }`}>
              <Icon className="w-6 h-6" />
            </div>
          </div>

          <h3 className="text-xl sm:text-2xl font-bold text-text-dark mb-2">{plan.name}</h3>
          <p className="text-text-medium text-sm sm:text-base mb-4">{plan.description}</p>

          {type === 'corporate' && (
            <p className="text-sm text-primary font-medium mb-4">{plan.userRange}</p>
          )}

          <div className="mb-6">
            {isEnterprise ? (
              <div className="text-2xl font-bold text-text-dark">Custom Pricing</div>
            ) : (
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-bold text-text-dark leading-none">
                    ${plan.price}
                  </span>
                  {plan.originalPrice && (
                    <span className="text-base sm:text-lg text-text-muted line-through font-semibold">
                      ${plan.originalPrice}
                    </span>
                  )}
                </div>
                <div className="text-left text-sm text-text-medium leading-snug">
                  <div>
                    per {type === 'corporate' ? 'user / ' : ''}
                    {billingCycle === 'monthly' ? 'month' : 'year'}
                  </div>
                  <div className="text-text-light">
                    billed {billingCycle === 'monthly' ? 'monthly' : 'annually'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <ul className="space-y-3 mb-8">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <Check className="w-5 h-5 text-success-default flex-shrink-0 mt-0.5" />
              <span className="text-text-dark">{feature}</span>
            </li>
          ))}
          {plan.limitations?.map((limitation, index) => (
            <li key={`limit-${index}`} className="flex items-start gap-3">
              <X className="w-5 h-5 text-text-muted flex-shrink-0 mt-0.5" />
              <span className="text-text-muted">{limitation}</span>
            </li>
          ))}
        </ul>

        {isEnterprise ? (
          <Link to="/contact" className="block">
            <Button
              className="w-full"
              variant="outline"
              size="lg"
            >
              {plan.cta}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        ) : (
          <Button
            className="w-full"
            variant={plan.popular ? 'primary' : 'outline'}
            size="lg"
            onClick={handleClick}
            disabled={isLoading || !!loadingPlan || !hasStripePriceId}
            title={
              !hasStripePriceId && plan.stripePriceKey
                ? priceState === 'invalid'
                  ? `Use price_... not prod_... — ${stripePriceEnvVarName(plan.stripePriceKey)}`
                  : `Set ${stripePriceEnvVarName(plan.stripePriceKey)} in Vercel project env and redeploy`
                : undefined
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Redirecting...
              </>
            ) : !hasStripePriceId ? (
              priceState === 'invalid' ? 'Invalid Price ID (use price_…)' : 'Billing not configured'
            ) : (
              <>
                {plan.cta}
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        )}
      </Card>
    )
  }

  const starterPriceState = stripePriceConfigState('starter_monthly')

  const isIndividual = audience === 'individual'
  const activePlans = isIndividual ? individualPlans : corporatePlans
  const audienceCopy = isIndividual
    ? {
        heading: 'Individual Plans',
        subheading: 'Perfect for individual learners looking to advance their skills and career.'
      }
    : {
        heading: 'Corporate Plans',
        subheading: 'Empower your entire organization with comprehensive learning management.'
      }

  const comparisonColumns = isIndividual
    ? [
        { key: 'starter', label: 'Starter' },
        { key: 'pro', label: 'Pro' },
        { key: 'premium', label: 'Premium' }
      ]
    : [
        { key: 'team', label: 'Team' },
        { key: 'business', label: 'Business' },
        { key: 'enterprise', label: 'Enterprise' }
      ]

  const comparisonRows = [
    { feature: 'Course Access', starter: '50+ courses', pro: '1000+ courses', premium: 'All courses', team: 'All courses', business: 'All courses', enterprise: 'All courses' },
    { feature: 'Progress Tracking', starter: '✓', pro: '✓', premium: '✓', team: '✓', business: '✓', enterprise: '✓' },
    { feature: 'Mobile App', starter: '✓', pro: '✓', premium: '✓', team: '✓', business: '✓', enterprise: '✓' },
    { feature: 'Offline Downloads', starter: '✗', pro: '✓', premium: '✓', team: '✓', business: '✓', enterprise: '✓' },
    { feature: 'Admin Dashboard', starter: '✗', pro: '✗', premium: '✗', team: '✓', business: '✓', enterprise: '✓' },
    { feature: 'Team Reporting', starter: '✗', pro: '✗', premium: '✗', team: 'Basic', business: 'Advanced', enterprise: 'Custom' },
    { feature: 'Custom Branding', starter: '✗', pro: '✗', premium: '✗', team: '✗', business: '✓', enterprise: '✓' },
    { feature: 'API Access', starter: '✗', pro: '✗', premium: '✗', team: '✗', business: '✓', enterprise: '✓' },
    { feature: 'Support', starter: 'Community', pro: 'Email', premium: 'Priority', team: 'Email', business: 'Priority', enterprise: '24/7 Dedicated' }
  ]

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-dark to-primary text-white py-12 sm:py-16 md:py-20">
        <div className="max-w-8xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <PageTitle
            size="hero"
            align="center"
            title="Simple, Transparent Pricing"
            titleClassName="!text-white"
            subtitle="Choose the perfect plan for your learning journey. No hidden fees, cancel anytime, and scale as you grow."
            subtitleWrapperClassName="text-base sm:text-lg md:text-xl text-gray-200 max-w-3xl mx-auto"
          />
        </div>
      </section>

      {(priceConfigSummary.missing.length > 0 || priceConfigSummary.invalid.length > 0) && (
        <section className="py-4 sm:py-6 bg-amber-50 border-y border-amber-200">
          <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="p-4 sm:p-5 bg-white border-amber-200">
              <h3 className="text-base font-semibold text-amber-900 mb-2">
                Billing configuration incomplete
              </h3>
              <p className="text-sm text-amber-800">
                Some plans are disabled because Stripe price IDs are missing or invalid. Set the listed variables to valid
                <code> price_...</code> values and redeploy.
              </p>
              {priceConfigSummary.missing.length > 0 && (
                <p className="text-sm text-amber-800 mt-2 break-words">
                  Missing: {priceConfigSummary.missing.join(', ')}
                </p>
              )}
              {priceConfigSummary.invalid.length > 0 && (
                <p className="text-sm text-amber-800 mt-1 break-words">
                  Invalid (must start with <code>price_</code>): {priceConfigSummary.invalid.join(', ')}
                </p>
              )}
            </Card>
          </div>
        </section>
      )}

      {/* Plans for active audience */}
      <section className="py-12 sm:py-16 md:py-20 bg-background-light">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Inline controls row: audience tabs (center) + billing toggle (right) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 items-center gap-6 mb-10 sm:mb-14">
            <div className="hidden lg:block" aria-hidden="true" />

            {/* Audience tabs — sliding pill, light theme */}
            <div className="flex justify-center min-w-0">
              <div
                role="tablist"
                aria-label="Pricing audience"
                className="relative inline-flex items-center bg-white border border-background-dark rounded-full p-1 shadow-sm max-w-full"
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-primary shadow-md transition-transform duration-300 ease-out ${
                    audience === 'corporate' ? 'translate-x-full' : 'translate-x-0'
                  }`}
                />
                <button
                  type="button"
                  role="tab"
                  aria-selected={audience === 'individual'}
                  onClick={() => setAudience('individual')}
                  className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 sm:gap-2 sm:min-w-[140px] md:min-w-[160px] px-3 sm:px-6 py-2.5 rounded-full text-sm font-semibold transition-colors duration-200 ${
                    audience === 'individual'
                      ? 'text-white'
                      : 'text-text-medium hover:text-text-dark'
                  }`}
                >
                  <Star className="w-4 h-4 flex-shrink-0" />
                  Individuals
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={audience === 'corporate'}
                  onClick={() => setAudience('corporate')}
                  className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 sm:gap-2 sm:min-w-[140px] md:min-w-[160px] px-3 sm:px-6 py-2.5 rounded-full text-sm font-semibold transition-colors duration-200 ${
                    audience === 'corporate'
                      ? 'text-white'
                      : 'text-text-medium hover:text-text-dark'
                  }`}
                >
                  <Building2 className="w-4 h-4 flex-shrink-0" />
                  Companies
                </button>
              </div>
            </div>

            {/* Billing toggle — iOS-style switch with inline savings caption */}
            <div className="flex justify-center lg:justify-end min-w-0">
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:gap-x-4">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`text-sm sm:text-base font-semibold transition-colors ${
                    billingCycle === 'monthly'
                      ? 'text-text-dark'
                      : 'text-text-muted hover:text-text-medium'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  role="switch"
                  aria-checked={billingCycle === 'annual'}
                  aria-label="Toggle billing cycle"
                  onClick={() =>
                    setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')
                  }
                  className="relative inline-flex h-7 w-12 items-center rounded-full bg-primary shadow-inner transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2"
                >
                  <span
                    aria-hidden="true"
                    className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-300 ease-out ${
                      billingCycle === 'annual' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('annual')}
                  className={`text-sm sm:text-base font-semibold transition-colors ${
                    billingCycle === 'annual'
                      ? 'text-text-dark'
                      : 'text-text-muted hover:text-text-medium'
                  }`}
                >
                  Annual
                </button>
                <span className="text-sm text-text-medium">
                  <span className="font-semibold text-success">Save 20%</span>
                  <span className="hidden sm:inline"> with annual</span>
                </span>
              </div>
            </div>
          </div>

          <div
            role="tabpanel"
            aria-label={audienceCopy.heading}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 pt-4 md:pt-6"
          >
            {activePlans.map((plan, index) => (
              <PlanCard key={`${audience}-${index}`} plan={plan} type={audience} />
            ))}
          </div>
        </div>
      </section>

      {/* Features Comparison */}
      <section className="py-12 sm:py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-xl sm:text-2xl font-bold text-text-dark mb-3 sm:mb-4">Feature Comparison</h2>
            <p className="text-base sm:text-lg md:text-xl text-text-medium">
              See what's included in each {isIndividual ? 'individual' : 'corporate'} plan
            </p>
          </div>

          <Card className="overflow-hidden p-0 sm:p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm sm:text-base">
                <thead>
                  <tr className="border-b border-background-dark">
                    <th className="text-left py-3 sm:py-4 px-3 sm:px-6 font-semibold text-text-dark">Features</th>
                    {comparisonColumns.map((col) => (
                      <th
                        key={col.key}
                        className="text-center py-3 sm:py-4 px-3 sm:px-6 font-semibold text-text-dark"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, index) => (
                    <tr key={index} className="border-b border-background-light">
                      <td className="py-3 sm:py-4 px-3 sm:px-6 font-medium text-text-dark whitespace-nowrap">{row.feature}</td>
                      {comparisonColumns.map((col) => (
                        <td
                          key={col.key}
                          className="py-3 sm:py-4 px-3 sm:px-6 text-center text-text-medium"
                        >
                          {row[col.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-background-light">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-xl sm:text-2xl font-bold text-text-dark mb-3 sm:mb-4">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {[
              {
                question: "Can I change plans anytime?",
                answer: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and you'll be charged prorated amounts."
              },
              {
                question: "Do you offer a free trial?",
                answer: "All paid plans come with a 14-day free trial. Your card will not be charged until the trial period ends."
              },
              {
                question: "What payment methods do you accept?",
                answer: "We accept all major credit cards (Visa, Mastercard, American Express) securely processed through Stripe. For enterprise customers, we can arrange invoice billing."
              },
              {
                question: "Is there a setup fee?",
                answer: "No setup fees for any plan. We believe in transparent, straightforward pricing."
              },
              {
                question: "Can I cancel anytime?",
                answer: "Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period."
              },
              {
                question: "Do you offer volume discounts?",
                answer: "Yes! For teams of 200+ users, we offer custom pricing with volume discounts. Contact our sales team for details."
              }
            ].map((faq, index) => (
              <Card key={index} className="p-5 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-text-dark mb-2 sm:mb-3">{faq.question}</h3>
                <p className="text-sm sm:text-base text-text-medium">{faq.answer}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-primary text-white">
        <div className="max-w-8xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Ready to Get Started?</h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-200 mb-6 sm:mb-8 max-w-2xl mx-auto">
            Join thousands of learners and organizations who trust Leadwise Academy for their development needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Button
              size="lg"
              className="w-full sm:w-auto bg-white text-primary hover:bg-gray-100"
              onClick={() => handleSubscribe('starter_monthly')}
              disabled={!!loadingPlan || starterPriceState !== 'ok'}
              title={
                starterPriceState === 'missing'
                  ? `Set ${stripePriceEnvVarName('starter_monthly')} in Vercel and redeploy`
                  : starterPriceState === 'invalid'
                    ? 'Use price_... from Stripe Pricing, not prod_...'
                    : undefined
              }
            >
              {loadingPlan === 'starter_monthly' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Redirecting...
                </>
              ) : starterPriceState !== 'ok' ? (
                starterPriceState === 'invalid' ? 'Invalid Price ID' : 'Billing not configured'
              ) : (
                'Get Started for $9/mo'
              )}
            </Button>
            <Link to="/contact" className="w-full sm:w-auto">
              <Button variant="ghost" size="lg" className="w-full sm:w-auto text-white border-white hover:bg-white hover:text-primary">
                Contact Sales
              </Button>
            </Link>
          </div>

          <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 sm:gap-x-8 text-sm text-gray-300">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>SOC 2 Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <HeadphonesIcon className="w-4 h-4" />
              <span>24/7 Support</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>99.9% Uptime</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
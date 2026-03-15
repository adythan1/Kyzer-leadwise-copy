// src/pages/public/Pricing.jsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
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
  HeadphonesIcon
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState('monthly') // 'monthly' or 'annual'

  const individualPlans = [
    {
      name: "Free",
      price: 0,
      description: "Perfect for getting started with learning",
      features: [
        "Access to 50+ free courses",
        "Basic progress tracking",
        "Community forums",
        "Mobile app access",
        "Certificate of completion"
      ],
      limitations: [
        "Limited to 5 courses per month",
        "No offline access",
        "Basic support only"
      ],
      cta: "Get Started Free",
      popular: false,
      icon: Star
    },
    {
      name: "Pro",
      price: billingCycle === 'monthly' ? 29 : 290,
      originalPrice: billingCycle === 'annual' ? 348 : null,
      description: "Unlock your full learning potential",
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
    
    return (
      <Card className={`relative p-8 ${plan.popular ? 'ring-2 ring-primary-default shadow-lg scale-105' : ''}`}>
        {plan.popular && (
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <span className="bg-primary-default text-white px-4 py-1 rounded-full text-sm font-medium">
              Most Popular
            </span>
          </div>
        )}
        
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              plan.popular ? 'bg-primary-default text-white' : 'bg-background-light text-primary-default'
            }`}>
              <Icon className="w-6 h-6" />
            </div>
          </div>
          
          <h3 className="text-2xl font-bold text-text-dark mb-2">{plan.name}</h3>
          <p className="text-text-light mb-4">{plan.description}</p>
          
          {type === 'corporate' && (
            <p className="text-sm text-primary-default font-medium mb-4">{plan.userRange}</p>
          )}
          
          <div className="mb-6">
            {isEnterprise ? (
              <div className="text-2xl font-bold text-text-dark">Custom Pricing</div>
            ) : (
              <>
                <div className="text-4xl font-bold text-text-dark">
                  ${plan.price}
                  {plan.originalPrice && (
                    <span className="text-lg text-text-muted line-through ml-2">
                      ${plan.originalPrice}
                    </span>
                  )}
                </div>
                <div className="text-text-light">
                  per {type === 'corporate' ? 'user/' : ''}{billingCycle === 'monthly' ? 'month' : 'year'}
                  {billingCycle === 'annual' && (
                    <span className="text-success-default font-medium ml-2">
                      Save {Math.round(((plan.originalPrice - plan.price) / plan.originalPrice) * 100)}%
                    </span>
                  )}
                </div>
              </>
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

        <Link to={isEnterprise ? "/contact" : "/signup"} className="block">
          <Button 
            className={`w-full ${plan.popular ? 'bg-primary-default hover:bg-primary-dark' : ''}`}
            variant={plan.popular ? 'default' : 'secondary'}
          >
            {plan.cta}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </Card>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-dark to-primary-default text-white py-20">
        <div className="max-w-8xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-200 mb-8">
            Choose the perfect plan for your learning journey. No hidden fees, 
            cancel anytime, and scale as you grow.
          </p>
          
          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-white/10 rounded-lg p-1 mb-8">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                billingCycle === 'monthly' 
                  ? 'bg-white text-primary-default shadow-sm' 
                  : 'text-white hover:text-gray-200'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all relative ${
                billingCycle === 'annual' 
                  ? 'bg-white text-primary-default shadow-sm' 
                  : 'text-white hover:text-gray-200'
              }`}
            >
              Annual
              <span className="absolute -top-2 -right-2 bg-success-default text-white text-xs px-1.5 py-0.5 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Individual Plans */}
      <section className="py-20 bg-background-light">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl font-bold text-text-dark mb-4">Individual Plans</h2>
            <p className="text-xl text-text-light max-w-2xl mx-auto">
              Perfect for individual learners looking to advance their skills and career
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {individualPlans.map((plan, index) => (
              <PlanCard key={index} plan={plan} type="individual" />
            ))}
          </div>
        </div>
      </section>

      {/* Corporate Plans */}
      <section className="py-20">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl font-bold text-text-dark mb-4">Corporate Plans</h2>
            <p className="text-xl text-text-light max-w-2xl mx-auto">
              Empower your entire organization with comprehensive learning management
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {corporatePlans.map((plan, index) => (
              <PlanCard key={index} plan={plan} type="corporate" />
            ))}
          </div>
        </div>
      </section>

      {/* Features Comparison */}
      <section className="py-20 bg-background-light">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl font-bold text-text-dark mb-4">Feature Comparison</h2>
            <p className="text-xl text-text-light">
              See what's included in each plan
            </p>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-background-dark">
                    <th className="text-left py-4 px-6 font-semibold text-text-dark">Features</th>
                    <th className="text-center py-4 px-6 font-semibold text-text-dark">Free</th>
                    <th className="text-center py-4 px-6 font-semibold text-text-dark">Pro</th>
                    <th className="text-center py-4 px-6 font-semibold text-text-dark">Premium</th>
                    <th className="text-center py-4 px-6 font-semibold text-text-dark">Team</th>
                    <th className="text-center py-4 px-6 font-semibold text-text-dark">Business</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: "Course Access", free: "50+ courses", pro: "1000+ courses", premium: "All courses", team: "All courses", business: "All courses" },
                    { feature: "Progress Tracking", free: "✓", pro: "✓", premium: "✓", team: "✓", business: "✓" },
                    { feature: "Mobile App", free: "✓", pro: "✓", premium: "✓", team: "✓", business: "✓" },
                    { feature: "Offline Downloads", free: "✗", pro: "✓", premium: "✓", team: "✓", business: "✓" },
                    { feature: "Admin Dashboard", free: "✗", pro: "✗", premium: "✗", team: "✓", business: "✓" },
                    { feature: "Team Reporting", free: "✗", pro: "✗", premium: "✗", team: "Basic", business: "Advanced" },
                    { feature: "Custom Branding", free: "✗", pro: "✗", premium: "✗", team: "✗", business: "✓" },
                    { feature: "API Access", free: "✗", pro: "✗", premium: "✗", team: "✗", business: "✓" },
                    { feature: "Support", free: "Community", pro: "Email", premium: "Priority", team: "Email", business: "Priority" }
                  ].map((row, index) => (
                    <tr key={index} className="border-b border-background-light">
                      <td className="py-4 px-6 font-medium text-text-dark">{row.feature}</td>
                      <td className="py-4 px-6 text-center text-text-medium">{row.free}</td>
                      <td className="py-4 px-6 text-center text-text-medium">{row.pro}</td>
                      <td className="py-4 px-6 text-center text-text-medium">{row.premium}</td>
                      <td className="py-4 px-6 text-center text-text-medium">{row.team}</td>
                      <td className="py-4 px-6 text-center text-text-medium">{row.business}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl font-bold text-text-dark mb-4">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-8">
            {[
              {
                question: "Can I change plans anytime?",
                answer: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and you'll be charged prorated amounts."
              },
              {
                question: "Do you offer a free trial?",
                answer: "All paid plans come with a 14-day free trial. No credit card required to start your trial."
              },
              {
                question: "What payment methods do you accept?",
                answer: "We accept all major credit cards, PayPal, and for enterprise customers, we can arrange invoice billing."
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
              <Card key={index} className="p-6">
                <h3 className="text-lg font-semibold text-text-dark mb-3">{faq.question}</h3>
                <p className="text-text-light">{faq.answer}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-default text-white">
        <div className="max-w-8xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-gray-200 mb-8">
            Join thousands of learners and organizations who trust Leadwise Academy for their development needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg" className="bg-white text-primary-default hover:bg-gray-100">
                Start Free Trial
              </Button>
            </Link>
            <Link to="/contact">
              <Button variant="ghost" size="lg" className="text-white border-white hover:bg-white hover:text-primary-default">
                Contact Sales
              </Button>
            </Link>
          </div>
          
          <div className="mt-8 flex items-center justify-center gap-8 text-sm text-gray-300">
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
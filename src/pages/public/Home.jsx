// src/pages/public/Home.jsx
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Play,
  Users,
  BookOpen,
  Award,
  TrendingUp,
  CheckCircle,
  Star,
  Building2,
  Globe,
  Shield,
  Zap,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PageTitle from "@/components/layout/PageTitle";
export default function Home() {
  const features = [
    {
      icon: BookOpen,
      title: "Rich Course Catalog",
      description:
        "Access thousands of courses across technology, business, design, and more with new content added weekly.",
    },
    {
      icon: TrendingUp,
      title: "Advanced Analytics",
      description:
        "Track progress, measure engagement, and gain insights into learning patterns with comprehensive reporting.",
    },
    {
      icon: Users,
      title: "Corporate Management",
      description:
        "Manage teams, assign mandatory courses, and track organizational learning goals with powerful admin tools.",
    },
    {
      icon: Award,
      title: "Certification System",
      description:
        "Earn recognized certificates and badges that showcase your achievements and newly acquired skills.",
    },
    {
      icon: Globe,
      title: "Mobile Learning",
      description:
        "Learn anywhere, anytime with our responsive platform and offline course downloads.",
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description:
        "Bank-grade security with SSO integration, compliance features, and data protection guarantees.",
    },
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Learning & Development Manager",
      company: "TechCorp Inc.",
      avatar: "👩‍💼",
      content:
        "Leadwise Academy transformed our training program. Employee engagement increased by 300% and we can finally track real learning outcomes.",
      rating: 5,
    },
    {
      name: "Michael Chen",
      role: "Senior Developer",
      company: "StartupXYZ",
      avatar: "👨‍💻",
      content:
        "The courses are practical and up-to-date. I've learned more in 3 months than in my previous year of scattered online learning.",
      rating: 5,
    },
    {
      name: "Emily Rodriguez",
      role: "HR Director",
      company: "Global Solutions",
      avatar: "👩‍🎓",
      content:
        "Managing 500+ employees' learning paths used to be a nightmare. Now it's seamless with automated reporting and progress tracking.",
      rating: 5,
    },
  ];

  const stats = [
    { number: "50K+", label: "Active Learners" },
    { number: "1000+", label: "Expert-Led Courses" },
    { number: "500+", label: "Companies Trust Us" },
    { number: "98%", label: "Satisfaction Rate" },
  ];

  const useCases = [
    {
      icon: Users,
      title: "Individual Professionals",
      description:
        "Advance your career with personalized learning paths, skill assessments, and industry-recognized certifications.",
      features: [
        "Personalized recommendations",
        "Skill gap analysis",
        "Career coaching",
        "Portfolio building",
      ],
    },
    {
      icon: Building2,
      title: "Growing Teams",
      description:
        "Scale your team's capabilities with collaborative learning, team challenges, and shared knowledge bases.",
      features: [
        "Team progress tracking",
        "Collaborative projects",
        "Peer learning",
        "Skills matrix mapping",
      ],
    },
    {
      icon: Globe,
      title: "Large Enterprises",
      description:
        "Deploy organization-wide training with compliance tracking, custom content, and advanced reporting.",
      features: [
        "Custom integrations",
        "Compliance management",
        "Advanced analytics",
        "Multi-tenant architecture",
      ],
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-dark via-primary-default to-text-dark text-white py-10 lg:py-22">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <PageTitle
                size="hero"
                align="left"
                title={
                  <>
                    Transform Learning Into{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-green-200">
                      Growth
                    </span>
                  </>
                }
                titleClassName="!text-white !leading-tight"
                subtitle="Empower your team with the most comprehensive learning management system. From individual skill building to enterprise-wide training programs."
                subtitleWrapperClassName="text-xl text-gray-200 mb-8 leading-relaxed"
                className="mb-0"
              />

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link to="/signup">
                  <Button
                    size="lg"
                    className="bg-white text-primary-default hover:bg-gray-100"
                  >
                    Start Free Trial
                  </Button>
                </Link>

                <Link to="/about">
                  <Button
                    size="lg"
                    className="bg-white text-primary-default hover:bg-gray-100"
                  >
                    Learn More
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>

              <div className="flex items-center gap-6 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Free 14-day trial</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Cancel anytime</span>
                </div>
              </div>
            </div>

            {/* Hero Image/Visual */}
            <div className="relative">
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-6xl md:text-8xl opacity-20">
                  📚
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      {/* <section className="py-20 bg-background-light">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold text-primary-default mb-2">{stat.number}</div>
                <div className="text-text-light">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section> */}

      {/* Features Section */}
      <section className="py-20">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-4xl font-bold text-text-dark mb-4">
              Everything You Need to Scale Learning
            </h2>
            <p className="text-xl text-text-light max-w-2xl mx-auto">
              From individual growth to enterprise-wide training programs, we've
              got every learning scenario covered.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="p-8 text-center hover:shadow-lg transition-shadow"
                >
                  <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-6">
                    <Icon className="w-8 h-8 text-primary-default" />
                  </div>
                  <h3 className="text-xl font-semibold text-text-dark mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-text-light">{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 bg-background-light">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-4xl font-bold text-text-dark mb-4">
              Built for Every Learning Journey
            </h2>
            <p className="text-xl text-text-light max-w-2xl mx-auto">
              Whether you're an individual looking to grow or an organization
              scaling globally, we have the perfect solution for your needs.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {useCases.map((useCase, index) => {
              const Icon = useCase.icon;
              return (
                <Card key={index} className="p-8">
                  <div className="w-12 h-12 bg-primary-light rounded-lg flex items-center justify-center mb-6">
                    <Icon className="w-6 h-6 text-primary-default" />
                  </div>
                  <h3 className="text-xl font-semibold text-text-dark mb-4">
                    {useCase.title}
                  </h3>
                  <p className="text-text-light mb-6">{useCase.description}</p>
                  <ul className="space-y-2">
                    {useCase.features.map((feature, featureIndex) => (
                      <li
                        key={featureIndex}
                        className="flex items-center gap-3"
                      >
                        <CheckCircle className="w-4 h-4 text-success-default flex-shrink-0" />
                        <span className="text-text-dark text-sm">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-4xl font-bold text-text-dark mb-4">
              Loved by Learners and Leaders
            </h2>
            <p className="text-xl text-text-light max-w-2xl mx-auto">
              See why thousands of professionals and hundreds of organizations
              choose Leadwise Academy
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-8">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, starIndex) => (
                    <Star
                      key={starIndex}
                      className="w-4 h-4 fill-warning-default text-warning-default"
                    />
                  ))}
                </div>
                <p className="text-text-dark mb-6 italic">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{testimonial.avatar}</div>
                  <div>
                    <div className="font-semibold text-text-dark">
                      {testimonial.name}
                    </div>
                    <div className="text-sm text-text-light">
                      {testimonial.role}
                    </div>
                    <div className="text-sm text-primary-default">
                      {testimonial.company}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Integration Section */}
      <section className="py-20 bg-background-light">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-4xl font-bold text-text-dark mb-4">
            Seamlessly Integrates With Your Workflow
          </h2>
          <p className="text-xl text-text-light mb-12 max-w-2xl mx-auto">
            Connect with the tools your team already uses and loves
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 items-center justify-items-center">
            {[
              "Slack",
              "Microsoft Teams",
              "Google Workspace",
              "Zoom",
              "Salesforce",
              "HubSpot",
            ].map((integration, index) => (
              <Card
                key={index}
                className="w-24 h-24 flex items-center justify-center hover:shadow-md transition-shadow"
              >
                <div className="text-sm font-medium text-text-muted">
                  {integration}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        className="
      bg-gradient-to-br from-primary-dark via-primary-default to-text-dark text-white py-10 lg:py-22
      "
      >
        <div className="w-full text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-4xl font-bold mb-6">
            Ready to Transform Your Learning?
          </h2>
          <p className="text-xl text-gray-200 mb-8">
            Join thousands of professionals and organizations who are already
            growing with Leadwise Academy
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link to="/signup">
              <Button
                size="lg"
                className="bg-white text-primary-default hover:bg-gray-100"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button
                size="lg"
                className="text-white border-white hover:bg-white hover:text-primary-default"
              >
                Schedule Demo
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-4 h-4" />
              <span>Setup in minutes</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Enterprise-grade security</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Users className="w-4 h-4" />
              <span>24/7 support included</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

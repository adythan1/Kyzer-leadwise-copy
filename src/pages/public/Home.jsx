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
import ScrollReveal from "@/components/ui/ScrollReveal";
import PageTitle from "@/components/layout/PageTitle";
import studentImage from "../../assets/images/student.png";
import studentImage1 from "../../assets/images/studentvector.png";
import studentImage2 from "../../assets/images/student-learning.png";
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
                    <span className="bg-gradient-to-r from-blue-200 to-green-200 bg-clip-text text-transparent">
                      Growth
                    </span>
                  </>
                }
                titleClassName="!text-white !leading-tight opacity-0 motion-safe:animate-home-fade-up motion-reduce:animate-none motion-reduce:opacity-100"
                accentClassName="scale-x-0 motion-safe:animate-home-accent motion-safe:[animation-delay:320ms] motion-reduce:scale-x-100 motion-reduce:animate-none"
                subtitle="Empower your team with the most comprehensive learning management system. From individual skill building to enterprise-wide training programs."
                subtitleWrapperClassName="text-xl text-gray-200 mb-8 leading-relaxed opacity-0 motion-safe:animate-home-fade-up motion-safe:delay-200 motion-reduce:animate-none motion-reduce:opacity-100"
                className="mb-0"
              />

              <div className="flex flex-col sm:flex-row gap-4 mb-8 opacity-0 motion-safe:animate-home-fade-up motion-safe:delay-300 motion-reduce:animate-none motion-reduce:opacity-100">
                <Link to="/signup">
                  <Button
                    size="lg"
                    className="bg-white text-primary-default transition-transform hover:bg-gray-100 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Start Free Trial
                  </Button>
                </Link>

                <Link to="/about" className="group inline-flex">
                  <Button
                    size="lg"
                    className="bg-white text-primary-default transition-transform hover:bg-gray-100 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Learn More
                    <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-300 opacity-0 motion-safe:animate-home-fade-up motion-safe:delay-500 motion-reduce:animate-none motion-reduce:opacity-100">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-green-400" />
                  <span>Free 14-day trial</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-green-400" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-green-400" />
                  <span>Cancel anytime</span>
                </div>
              </div>
            </div>

            {/* Hero Image/Visual */}
            <div className="relative opacity-0 motion-safe:animate-home-fade-up motion-safe:delay-200 motion-reduce:animate-none motion-reduce:opacity-100">
              <div className="flex h-full w-full items-center justify-center">
                <div className="text-6xl md:text-8xl opacity-70 motion-safe:animate-home-float motion-reduce:animate-none">
                  <img
                    src={studentImage1}
                    alt="Leadwise Academy"
                    className="h-full w-full object-cover"
                  />
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
          <ScrollReveal className="mb-16 text-center">
            <h2 className="text-2xl md:text-4xl font-bold text-text-dark mb-4">
              Built for Every Learning Journey
            </h2>
            <p className="text-xl text-text-light max-w-2xl mx-auto">
              Whether you're an individual looking to grow or an organization
              scaling globally, we have the perfect solution for your needs.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {useCases.map((useCase, index) => {
              const Icon = useCase.icon;
              return (
                <ScrollReveal key={index} delayMs={index * 90} className="h-full">
                  <Card className="h-full p-8">
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
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="mb-16 text-center">
            <h2 className="text-2xl md:text-4xl font-bold text-text-dark mb-4">
              Loved by Learners and Leaders
            </h2>
            <p className="text-xl text-text-light max-w-2xl mx-auto">
              See why thousands of professionals and hundreds of organizations
              choose Leadwise Academy
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <ScrollReveal key={index} delayMs={index * 85} className="h-full">
                <Card className="h-full p-8">
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
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Integration Section */}
      <section className="py-20 bg-background-light">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <ScrollReveal>
            <h2 className="text-2xl md:text-4xl font-bold text-text-dark mb-4">
              Seamlessly Integrates With Your Workflow
            </h2>
            <p className="text-xl text-text-light mb-12 max-w-2xl mx-auto">
              Connect with the tools your team already uses and loves
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 items-center justify-items-center">
            {[
              "Slack",
              "Microsoft Teams",
              "Google Workspace",
              "Zoom",
              "Salesforce",
              "HubSpot",
            ].map((integration, index) => (
              <ScrollReveal key={integration} delayMs={index * 60}>
                <Card className="w-24 h-24 flex items-center justify-center transition-shadow hover:shadow-md">
                  <div className="text-sm font-medium text-text-muted">
                    {integration}
                  </div>
                </Card>
              </ScrollReveal>
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
          <ScrollReveal>
            <h2 className="text-2xl md:text-4xl font-bold mb-6">
              Ready to Transform Your Learning?
            </h2>
          </ScrollReveal>
          <ScrollReveal delayMs={90}>
            <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
              Join thousands of professionals and organizations who are already
              growing with Leadwise Academy
            </p>
          </ScrollReveal>

          <ScrollReveal delayMs={160}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link to="/signup" className="group inline-flex justify-center">
                <Button
                  size="lg"
                  className="bg-white text-primary-default transition-transform hover:bg-gray-100 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/contact" className="flex justify-center">
                <Button
                  size="lg"
                  className="text-white border-white transition-transform hover:bg-white hover:text-primary-default hover:scale-[1.02] active:scale-[0.98]"
                >
                  Schedule Demo
                </Button>
              </Link>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <ScrollReveal delayMs={100} className="flex justify-center">
              <div className="flex items-center justify-center gap-2">
                <Zap className="w-4 h-4 shrink-0" />
                <span>Setup in minutes</span>
              </div>
            </ScrollReveal>
            <ScrollReveal delayMs={170} className="flex justify-center">
              <div className="flex items-center justify-center gap-2">
                <Shield className="w-4 h-4 shrink-0" />
                <span>Enterprise-grade security</span>
              </div>
            </ScrollReveal>
            <ScrollReveal delayMs={240} className="flex justify-center">
              <div className="flex items-center justify-center gap-2">
                <Users className="w-4 h-4 shrink-0" />
                <span>24/7 support included</span>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </div>
  );
}

// src/pages/public/About.jsx
import { 
  Users, 
  Target, 
  Award, 
  Globe,
  CheckCircle,
  ArrowRight,
  Building2,
  BookOpen,
  TrendingUp
} from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import PageTitle from '@/components/layout/PageTitle'

export default function About() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-dark to-primary text-white py-20">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-8xl mx-auto">
            <PageTitle
              size="hero"
              align="center"
              title="Transforming Learning for the Modern Workplace"
              titleClassName="!text-white"
              subtitle="We're on a mission to make professional development accessible, engaging, and effective for individuals and organizations worldwide."
              subtitleWrapperClassName="text-xl text-gray-200 mb-8 max-w-3xl mx-auto"
            />
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button size="lg" className="bg-white text-primary-default hover:bg-gray-100">
                  Start Learning Today
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="ghost" size="lg" className="text-white border-white hover:bg-white hover:text-primary-default">
                  Get in Touch
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 bg-background-light">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <Card className="text-center p-8">
              <Target className="w-12 h-12 text-primary-default mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-text-dark mb-4">Our Mission</h3>
              <p className="text-text-light">
                To democratize professional learning by providing cutting-edge tools 
                that make skill development accessible, measurable, and impactful for 
                every learner and organization.
              </p>
            </Card>

            <Card className="text-center p-8">
              <Globe className="w-12 h-12 text-success-default mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-text-dark mb-4">Our Vision</h3>
              <p className="text-text-light">
                A world where continuous learning is seamlessly integrated into work life, 
                enabling individuals and teams to adapt, grow, and thrive in an 
                ever-changing landscape.
              </p>
            </Card>

            <Card className="text-center p-8">
              <Award className="w-12 h-12 text-warning-default mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-text-dark mb-4">Our Values</h3>
              <p className="text-text-light">
                Excellence in education, innovation in technology, and commitment to 
                making learning engaging, effective, and accessible for everyone, 
                everywhere.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl font-bold text-text-dark mb-6">Our Story</h2>
              <div className="space-y-4 text-text-medium">
                <p>
                  Founded in 2023, Leadwise Academy emerged from a simple observation: traditional 
                  learning management systems were failing to meet the needs of modern, 
                  fast-paced organizations and their learners.
                </p>
                <p>
                  Our founding team, with decades of combined experience in education technology, 
                  corporate training, and software development, set out to build something different—a 
                  platform that would be intuitive for learners, powerful for administrators, and 
                  flexible enough to grow with any organization.
                </p>
                <p>
                  Today, we serve hundreds of organizations and thousands of learners worldwide, 
                  helping them achieve their professional development goals through innovative 
                  technology and thoughtful design.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <Card className="p-6 text-center">
                  <div className="text-2xl font-bold text-primary-default">10K+</div>
                  <div className="text-sm text-text-light">Active Learners</div>
                </Card>
                <Card className="p-6 text-center">
                  <div className="text-2xl font-bold text-success-default">500+</div>
                  <div className="text-sm text-text-light">Companies</div>
                </Card>
              </div>
              <div className="space-y-4 mt-8">
                <Card className="p-6 text-center">
                  <div className="text-2xl font-bold text-warning-default">1M+</div>
                  <div className="text-sm text-text-light">Courses Completed</div>
                </Card>
                <Card className="p-6 text-center">
                  <div className="text-2xl font-bold text-error-default">98%</div>
                  <div className="text-sm text-text-light">Satisfaction Rate</div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What Makes Us Different */}
      <section className="py-20 bg-background-light">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl font-bold text-text-dark mb-4">What Makes Us Different</h2>
            <p className="text-xl text-text-light max-w-2xl mx-auto">
              We've reimagined learning management from the ground up, focusing on user experience, 
              powerful analytics, and seamless scalability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-primary-default" />
              </div>
              <h3 className="text-xl font-semibold text-text-dark mb-4">Learner-Centric Design</h3>
              <p className="text-text-light">
                Every feature is designed with the learner in mind, creating engaging experiences 
                that drive completion and retention.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-success-light rounded-full flex items-center justify-center mx-auto mb-6">
                <TrendingUp className="w-8 h-8 text-success-default" />
              </div>
              <h3 className="text-xl font-semibold text-text-dark mb-4">Advanced Analytics</h3>
              <p className="text-text-light">
                Comprehensive insights into learning progress, engagement patterns, and 
                organizational skill development.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-warning-light rounded-full flex items-center justify-center mx-auto mb-6">
                <Building2 className="w-8 h-8 text-warning-default" />
              </div>
              <h3 className="text-xl font-semibold text-text-dark mb-4">Enterprise Ready</h3>
              <p className="text-text-light">
                Built for scale with enterprise-grade security, compliance features, 
                and seamless integrations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Leadership Team */}
      <section className="py-20">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl font-bold text-text-dark mb-4">Leadership Team</h2>
            <p className="text-xl text-text-light">
              Meet the team driving innovation in learning technology
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Sarah Chen",
                role: "CEO & Co-Founder",
                bio: "Former VP of Learning at Google, 15+ years in EdTech",
                image: "👩‍💼"
              },
              {
                name: "Marcus Rodriguez",
                role: "CTO & Co-Founder", 
                bio: "Ex-Principal Engineer at Spotify, Full-stack expert",
                image: "👨‍💻"
              },
              {
                name: "Dr. Emily Watson",
                role: "Chief Learning Officer",
                bio: "PhD in Educational Psychology, Former MIT researcher",
                image: "👩‍🎓"
              }
            ].map((member, index) => (
              <Card key={index} className="text-center p-8">
                <div className="text-6xl mb-4">{member.image}</div>
                <h3 className="text-xl font-semibold text-text-dark mb-2">{member.name}</h3>
                <p className="text-primary-default font-medium mb-3">{member.role}</p>
                <p className="text-text-light text-sm">{member.bio}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-primary text-white">
        <div className="max-w-8xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-6 text-white">Ready to Transform Your Learning?</h2>
          <p className="text-xl text-white/90 mb-8">
            Join thousands of organizations that trust Leadwise Academy for their learning and development needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg" className="bg-white text-primary-default hover:bg-gray-100">
                Start Free Trial
              </Button>
            </Link>
            <Link to="/pricing">
              <Button variant="ghost" size="lg" className="text-white border-white hover:bg-white hover:text-primary-default">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
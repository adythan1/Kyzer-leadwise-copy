// src/pages/public/Contact.jsx
import { useState } from 'react'
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock,
  MessageCircle,
  HelpCircle,
  Building2,
  Users,
  Send,
  CheckCircle
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import PageTitle from '@/components/layout/PageTitle'

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    subject: 'general',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setIsSubmitting(false)
    setIsSubmitted(true)
    
    // Reset form after 3 seconds
    setTimeout(() => {
      setIsSubmitted(false)
      setFormData({
        name: '',
        email: '',
        company: '',
        subject: 'general',
        message: ''
      })
    }, 3000)
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const contactMethods = [
    {
      icon: Mail,
      title: "Email Us",
      description: "Send us an email and we'll respond within 24 hours",
      contact: "info@kyzersolutions.com",
      action: "mailto:info@kyzersolutions.com"
    },
    {
      icon: Phone,
      title: "Call Us",
      description: "Speak directly with our team during business hours",
      contact: "+1 617 5600 821",
      action: "tel:+16175600821"
    },
    {
      icon: MessageCircle,
      title: "Live Chat",
      description: "Get instant help with our live chat support",
      contact: "Available 9 AM - 6 PM PST",
      action: "#"
    }
  ]

  const officeLocations = [
    {
      city: "Waltham",
      address: "56 Russell St",
      zipcode: "Waltham, MA 02453",
      phone: "+1 617 5600 821",
      isPrimary: true
    }
  ]

  const supportCategories = [
    {
      icon: HelpCircle,
      title: "General Questions",
      description: "Product information, pricing, or general inquiries"
    },
    {
      icon: Users,
      title: "Sales & Partnerships",
      description: "Enterprise sales, partnerships, or custom solutions"
    },
    {
      icon: Building2,
      title: "Technical Support",
      description: "Account issues, technical problems, or platform help"
    }
  ]

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center p-8">
          <div className="w-16 h-16 bg-success-light rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-success-default" />
          </div>
          <h2 className="text-2xl font-bold text-text-dark mb-4">Thank You!</h2>
          <p className="text-text-light mb-6">
            We've received your message and will get back to you within 24 hours.
          </p>
          <Button onClick={() => setIsSubmitted(false)}>
            Send Another Message
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-dark to-primary-default text-white py-20">
        <div className="max-w-8xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <PageTitle
            size="hero"
            align="center"
            title="Get in Touch"
            titleClassName="!text-white"
            subtitle="Have questions about Leadwise Academy? We're here to help you succeed with your learning initiatives."
            subtitleWrapperClassName="text-xl text-gray-200 mb-8 max-w-3xl mx-auto"
          />
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-20 bg-background-light">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl font-bold text-text-dark mb-4">How Can We Help?</h2>
            <p className="text-xl text-text-light">
              Choose the best way to reach us
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {contactMethods.map((method, index) => {
              const Icon = method.icon
              return (
                <Card key={index} className="text-center p-8 hover:shadow-lg transition-shadow">
                  <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-6">
                    <Icon className="w-8 h-8 text-primary-default" />
                  </div>
                  <h3 className="text-xl font-semibold text-text-dark mb-3">{method.title}</h3>
                  <p className="text-text-light mb-4">{method.description}</p>
                  <a
                    href={method.action}
                    className="text-primary-default font-medium hover:underline"
                  >
                    {method.contact}
                  </a>
                </Card>
              )
            })}
          </div>

          {/* Support Categories */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {supportCategories.map((category, index) => {
              const Icon = category.icon
              return (
                <div key={index} className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-background-medium rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-primary-default" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-dark mb-2">{category.title}</h3>
                    <p className="text-text-light text-sm">{category.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Contact Form & Office Info */}
      <section className="py-20">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Contact Form */}
            <div>
              <h2 className="text-2xl font-bold text-text-dark mb-6">Send Us a Message</h2>
              <p className="text-text-light mb-8">
                Fill out the form below and we'll get back to you as soon as possible.
              </p>

              <Card className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-text-dark mb-2">
                        Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full p-3 border border-background-dark rounded-lg focus:ring-2 focus:ring-primary-default focus:border-primary-default"
                        placeholder="Your full name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-text-dark mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full p-3 border border-background-dark rounded-lg focus:ring-2 focus:ring-primary-default focus:border-primary-default"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-dark mb-2">
                      Company
                    </label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      className="w-full p-3 border border-background-dark rounded-lg focus:ring-2 focus:ring-primary-default focus:border-primary-default"
                      placeholder="Your company name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-dark mb-2">
                      Subject *
                    </label>
                    <select
                      name="subject"
                      required
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full p-3 border border-background-dark rounded-lg focus:ring-2 focus:ring-primary-default focus:border-primary-default"
                    >
                      <option value="general">General Inquiry</option>
                      <option value="sales">Sales & Pricing</option>
                      <option value="support">Technical Support</option>
                      <option value="partnership">Partnership Opportunities</option>
                      <option value="demo">Request a Demo</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-dark mb-2">
                      Message *
                    </label>
                    <textarea
                      name="message"
                      required
                      rows={6}
                      value={formData.message}
                      onChange={handleChange}
                      className="w-full p-3 border border-background-dark rounded-lg focus:ring-2 focus:ring-primary-default focus:border-primary-default"
                      placeholder="Tell us how we can help you..."
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </Card>
            </div>

            {/* Office Locations */}
            <div>
              <h2 className="text-2xl font-bold text-text-dark mb-6">Our Office</h2>
              <p className="text-text-light mb-8">
                Visit us at our office or reach out to our team.
              </p>

              <div className="space-y-6">
                {officeLocations.map((office, index) => (
                  <Card key={index} className={`p-6 ${office.isPrimary ? 'ring-2 ring-primary-default' : ''}`}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-primary-light rounded-lg flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-6 h-6 text-primary-default" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-text-dark mb-2">
                          {office.city}
                          {office.isPrimary && (
                            <span className="ml-2 text-xs bg-primary-default text-white px-2 py-1 rounded-full">
                              HQ
                            </span>
                          )}
                        </h3>
                        <p className="text-text-medium mb-1">{office.address}</p>
                        <p className="text-text-medium mb-2">{office.zipcode}</p>
                        <p className="text-primary-default font-medium">{office.phone}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Business Hours */}
              <Card className="mt-8 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="w-6 h-6 text-primary-default" />
                  <h3 className="font-semibold text-text-dark">Business Hours</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-medium">Monday - Friday</span>
                    <span className="text-text-dark">9:00 AM - 6:00 PM PST</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-medium">Saturday</span>
                    <span className="text-text-dark">10:00 AM - 2:00 PM PST</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-medium">Sunday</span>
                    <span className="text-text-muted">Closed</span>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-background-light rounded-lg">
                  <p className="text-sm text-text-medium">
                    <strong>Note:</strong> For urgent technical issues, our support team is available 24/7 
                    for Enterprise customers.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Quick Links */}
      <section className="py-20 bg-background-light">
        <div className="max-w-8xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-text-dark mb-6">Looking for Quick Answers?</h2>
          <p className="text-xl text-text-light mb-8">
            Check out our frequently asked questions or browse our help center
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <HelpCircle className="w-12 h-12 text-primary-default mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-text-dark mb-3">Help Center</h3>
              <p className="text-text-light mb-4">
                Browse our comprehensive knowledge base and tutorials
              </p>
              <Button variant="secondary">
                Visit Help Center
              </Button>
            </Card>
            
            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <MessageCircle className="w-12 h-12 text-success-default mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-text-dark mb-3">Community Forum</h3>
              <p className="text-text-light mb-4">
                Connect with other users and get community support
              </p>
              <Button variant="secondary">
                Join Community
              </Button>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
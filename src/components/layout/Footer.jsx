// src/components/layout/Footer.jsx
import { Link } from 'react-router-dom'
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin,
  Twitter,
  Linkedin,
  Github,
  Heart
} from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-text-dark text-white">
      {/* Main Footer Content */}
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-default rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">K</span>
              </div>
              <span className="text-xl font-bold">Leadwise Academy</span>
            </div>
            <p className="text-text-light max-w-sm">
              Empowering organizations with modern learning management solutions. 
              Transform your team's potential through engaging, effective education.
            </p>
            <div className="flex space-x-4">
              <a 
                href="#" 
                className="text-text-light hover:text-white transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a 
                href="#" 
                className="text-text-light hover:text-white transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a 
                href="#" 
                className="text-text-light hover:text-white transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Product</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/courses" className="text-text-light hover:text-white transition-colors">
                  Course Catalog
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-text-light hover:text-white transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <a href="#" className="text-text-light hover:text-white transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#" className="text-text-light hover:text-white transition-colors">
                  Integrations
                </a>
              </li>
              <li>
                <a href="#" className="text-text-light hover:text-white transition-colors">
                  API Documentation
                </a>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Company</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/about" className="text-text-light hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <a href="#" className="text-text-light hover:text-white transition-colors">
                  Careers
                </a>
              </li>
              <li>
                <a href="#" className="text-text-light hover:text-white transition-colors">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="text-text-light hover:text-white transition-colors">
                  Press
                </a>
              </li>
              <li>
                <a href="#" className="text-text-light hover:text-white transition-colors">
                  Partners
                </a>
              </li>
            </ul>
          </div>

          {/* Support & Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Support</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/contact" className="text-text-light hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <a href="#" className="text-text-light hover:text-white transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="text-text-light hover:text-white transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="text-text-light hover:text-white transition-colors">
                  System Status
                </a>
              </li>
              <li>
                <a href="#" className="text-text-light hover:text-white transition-colors">
                  Community
                </a>
              </li>
            </ul>

            {/* Contact Info */}
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-text-light">
                <Mail className="w-4 h-4" />
                <span className="text-sm">support@kyzer.com</span>
              </div>
              <div className="flex items-center gap-2 text-text-light">
                <Phone className="w-4 h-4" />
                <span className="text-sm">+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center gap-2 text-text-light">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">San Francisco, CA</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-700">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-1">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Copyright */}
            <div className="flex items-center space-x-4 text-sm text-text-light">
              <span>© {currentYear} Leadwise Academy. All rights reserved.</span>
              <span className="hidden md:inline">•</span>
              <span className="flex items-center gap-1">
                Made with <Heart className="w-4 h-4 text-red-500" fill="currentColor" /> for learners
              </span>
            </div>

            {/* Legal Links */}
            <div className="flex items-center space-x-6 text-sm">
              <a href="#" className="text-text-light hover:text-white transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-text-light hover:text-white transition-colors">
                Terms of Service
              </a>
              <a href="#" className="text-text-light hover:text-white transition-colors">
                Cookie Policy
              </a>
              <a href="#" className="text-text-light hover:text-white transition-colors">
                GDPR
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
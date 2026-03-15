// src/components/layout/AuthLayout.jsx
import { Link } from 'react-router-dom'
import leadwiseLogo from "../../assets/images/leadwise.png"

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-background-white flex">
      {/* Left Side - Auth Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 max-w-md mx-auto lg:mx-0 lg:max-w-none lg:w-1/2">
        {/* Logo */}
        <div className="mb-8">
          <Link to="/" className="flex items-center space-x-3">
            <img src={leadwiseLogo} alt="Leadwise" className="h-10" />
            <div>
              <h1 className="text-2xl font-bold text-text-dark">Leadwise Academy</h1>
              <p className="text-sm text-text-muted">Learning Management System</p>
            </div>
          </Link>
        </div>

        {/* Auth Content */}
        <div className="w-full max-w-sm">
          {children}
        </div>

        {/* Footer Links */}
        <div className="mt-8 text-center">
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-6 text-sm text-text-muted">
            <Link to="/about" className="hover:text-text-dark transition-colors">
              About
            </Link>
            <Link to="/contact" className="hover:text-text-dark transition-colors">
              Contact
            </Link>
            <Link to="/privacy" className="hover:text-text-dark transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>

      {/* Right Side - Hero Section */}
      <div className="hidden lg:block lg:w-1/2 bg-gradient-to-br from-primary-dark to-primary relative">
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
        <div className="relative h-full flex flex-col justify-center px-12 text-white">
          <div className="max-w-lg">
            <h2 className="text-4xl font-bold mb-6">
              Continue Your Learning Journey
            </h2>
            <p className="text-xl mb-8 text-white/90">
              Access your courses, track your progress, and advance your skills with our comprehensive learning platform.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span className="text-lg">Self-paced learning modules</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span className="text-lg">Interactive assessments</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span className="text-lg">Professional certificates</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
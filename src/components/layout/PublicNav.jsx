import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuth';
import { Menu, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import leadwiseLogo from "../../assets/images/leadwise.svg";
import ThemeSwitcher from '@/components/ui/ThemeSwitcher';
import UserMenu from './UserMenu';

const PublicNav = () => {
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/about', label: 'About' },
    { path: '/pricing', label: 'Pricing' },
    { path: '/contact', label: 'Contact' },
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="bg-background-white border-b border-border shadow-sm sticky top-0 z-50 w-full relative">
      <div className="w-full px-4 sm:px-6 lg:px-8 max-w-full">
        <div className="flex items-center justify-between h-16">
          {/* Left Section - Logo and Navigation */}
          <div className="flex items-center space-x-8">
            {/* Logo */}
            <Link to="/" className="flex items-center">
              <img src={leadwiseLogo} alt="Leadwise Logo" className="h-[2rem]" />
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive(link.path)
                      ? 'text-primary bg-primary-light'
                      : 'text-text-medium hover:text-text-dark hover:bg-background-light'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center space-x-3">
            {/* Theme Switcher */}
            <ThemeSwitcher />

            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center space-x-3">
              {!loading && isAuthenticated ? (
                <>
                  <UserMenu />
                  <Link to="/app/dashboard">
                    <Button variant="primary" size="sm">
                      Dashboard
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="primary" size="sm">
                      Sign In
                    </Button>
                  </Link>
                  {/* <Link to="/signup">
                    <Button variant="primary" size="sm">
                      Get Started
                    </Button>
                  </Link> */}
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-text-medium hover:text-text-dark hover:bg-background-light transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border py-4">
            <div className="flex flex-col space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                    isActive(link.path)
                      ? 'text-primary bg-primary-light'
                      : 'text-text-medium hover:text-text-dark hover:bg-background-light'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-border space-y-2">
                {!loading && isAuthenticated ? (
                  <>
                    <Link
                      to="/app/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block"
                    >
                      <Button variant="primary" size="sm" className="w-full">
                        Dashboard
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block"
                    >
                      <Button variant="ghost" size="sm" className="w-full">
                        Sign In
                      </Button>
                    </Link>
                    <Link
                      to="/signup"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block"
                    >
                      <Button variant="primary" size="sm" className="w-full">
                        Get Started
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default PublicNav;


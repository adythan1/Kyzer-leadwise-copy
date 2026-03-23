import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, Bell } from 'lucide-react';
import { useAuth } from '@/hooks/auth/useAuth';
import leadwiseLogo from "../../assets/images/leadwise.svg";
import UserMenu from './UserMenu';
import ThemeSwitcher from '@/components/ui/ThemeSwitcher';

const Header = ({ onMenuClick }) => {
  const { isCorporateUser } = useAuth();

  // Determine home route based on user type
  const homeRoute = '/';

  return ( 
    <header className="bg-background-white border-b border-border shadow-sm sticky top-0 z-30 h-[64px] flex flex-row items-center">
      <div className="px-4 sm:px-4 py-4 w-full">
        <div className="flex items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center space-x-0">
            {/* Mobile Menu Button */}
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-lg text-text-medium hover:text-text-dark hover:bg-background-light transition-colors"
            >
              <Menu size={20} />
            </button>

            {/* Logo */}
            <Link to={homeRoute} className="flex items-center space-x-2">
              <img src={leadwiseLogo} alt="Leadwise Logo" className="h-[2rem]" />
            </Link>
          </div>


          {/* Right Section */}
          <div className="flex items-center space-x-2">

            {/* Theme Switcher */}
            <ThemeSwitcher />

            {/* Notifications */}
            <button className="p-2 rounded-lg text-text-medium hover:text-text-dark hover:bg-background-light transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* User Menu */}
            <UserMenu />
          </div>
        </div>

      </div>
    </header>
  );
};

export default Header;

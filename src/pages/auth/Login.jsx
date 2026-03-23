// src/pages/auth/Login.jsx
import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/auth/useAuth";
import LoginForm from "@/components/auth/LoginForm";
import { Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";
import leadwiseLogo from "../../assets/images/leadwise.svg";
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading,user,isAuthenticated } = useAuth();

  const from = location.state?.from?.pathname || "/app/dashboard";

  const handleLoginSuccess = () => {
    navigate(from, { replace: true });
  };
  if(isAuthenticated) {
return <Navigate to="/app/dashboard" replace />;     // Prevent rendering the login page if already authenticated
  }


  return (
    <div className="min-h-screen bg-background-light flex">
      {/* Left side - Login Form */}
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex justify-center">
              <img src={leadwiseLogo} alt="Leadwise Logo" className="h-20" />
            </div>
            <h2 className="text-2xl font-bold text-text-dark">Welcome back</h2>
            <p className="mt-2 text-sm text-text-light">
              Sign in to your account to continue learning
            </p>
          </div>

          {/* Login Form */}
          <LoginForm onSuccess={handleLoginSuccess} />

          {/* Footer Links */}
          <div className="text-center space-y-4">
            <div className="text-sm">
              <span className="text-text-light">Don't have an account? </span>
              <Link
                to="/signup"
                className="font-medium text-primary hover:text-primary-dark transition-colors"
              >
                Sign up here
              </Link>
            </div>

            <div className="text-sm">
              <Link
                to="/forgot-password"
                className="text-text-light hover:text-primary transition-colors"
              >
                Forgot your password?
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Marketing/Branding */}
      <div className="hidden lg:flex lg:flex-1 bg-primary relative overflow-hidden">
        <div className="flex items-center justify-center w-full p-12">
          
          <div className="text-center text-white max-w-lg">
            
            <h1 className="text-4xl font-bold mb-6">
              Continue Your Learning Journey
            </h1>
            <p className="text-lg text-gray-200 mb-8">
              Access your courses, track your progress, and advance your skills
              with our comprehensive learning platform.
            </p>

            {/* Feature highlights */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                  <ArrowRight className="w-3 h-3" />
                </div>
                <span className="text-gray-200">
                  Self-paced learning modules
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                  <ArrowRight className="w-3 h-3" />
                </div>
                <span className="text-gray-200">Interactive assessments</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                  <ArrowRight className="w-3 h-3" />
                </div>
                <span className="text-gray-200">Professional certificates</span>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
      </div>
    </div>
  );
}

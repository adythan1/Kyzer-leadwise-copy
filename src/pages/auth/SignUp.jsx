// src/pages/auth/Signup.jsx - ENSURE STATE IS WORKING
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react"; // Add useEffect
import { useAuth } from "@/hooks/auth/useAuth";
import SignupForm from "@/components/auth/SignupForm";
import { Users, User, Building, Check } from "lucide-react";
import leadwiseLogo from "../../assets/images/leadwise.svg";

export default function Signup() {
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState("individual");
  const { isAuthenticated } = useAuth();

  // 🔍 DEBUG: Track account type changes
  useEffect(() => {
  }, [accountType]);

  const handleSignupSuccess = (data) => {
    navigate(`/verify-email?email=${encodeURIComponent(data.email)}`, { 
      replace: true,
      state: { email: data.email, accountType }
    });
  };

  // 🔍 DEBUG: Log accountType when buttons are clicked
  const handleAccountTypeChange = (type) => {
    setAccountType(type);
  };

  if (isAuthenticated) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background-light flex">
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex justify-center">
              <img src={leadwiseLogo} alt="Leadwise Logo" className="h-20" />
            </div>
            <h2 className="text-2xl font-bold text-text-dark">
              Create your account
            </h2>
            <p className="mt-2 text-sm text-text-light">
              Start your learning journey today
            </p>
          </div>

          {/* Account Type Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-text-dark">
              Choose account type
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleAccountTypeChange("individual")} // ✅ Use handler
                className={`relative p-4 border rounded-lg text-left transition-all ${
                  accountType === "individual"
                    ? "border-primary bg-primary-light ring-2 ring-primary/20"
                    : "border-background-dark hover:border-primary-light"
                }`}
              >
                <div className="flex items-start space-x-3">
                  <User className="w-5 h-5 text-primary mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-dark">
                      Individual
                    </p>
                    <p className="text-xs text-text-light mt-1">
                      Personal learning account
                    </p>
                  </div>
                  {accountType === "individual" && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleAccountTypeChange("corporate")} // ✅ Use handler
                className={`relative p-4 border rounded-lg text-left transition-all ${
                  accountType === "corporate"
                    ? "border-primary bg-primary-light ring-2 ring-primary/20"
                    : "border-background-dark hover:border-primary-light"
                }`}
              >
                <div className="flex items-start space-x-3">
                  <Building className="w-5 h-5 text-primary mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-dark">
                      Corporate
                    </p>
                    <p className="text-xs text-text-light mt-1">
                      Up to 200 employees
                    </p>
                  </div>
                  {accountType === "corporate" && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Signup Form */}
          <SignupForm
            accountType={accountType}
            onSuccess={handleSignupSuccess}
          />

          {/* Footer Links */}
          <div className="text-center space-y-4">
            <div className="text-sm">
              <span className="text-text-light">Already have an account? </span>
              <Link
                to="/login"
                className="font-medium text-primary hover:text-primary-dark transition-colors"
              >
                Sign in here
              </Link>
            </div>

            <div className="text-xs text-text-light text-center">
              By creating an account, you agree to our{" "}
              <Link to="/terms" className="text-primary hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Marketing/Branding */}
      <div className="hidden lg:flex lg:flex-1 bg-primary relative overflow-hidden">
        <div className="flex items-center justify-center w-full p-12">
          <div className="text-center text-white max-w-lg">
            <h1 className="text-4xl font-bold mb-6">Start Learning Today</h1>
            <p className="text-lg text-gray-200 mb-8">
              Join thousands of learners advancing their careers with our
              comprehensive courses and professional certificates.
            </p>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-8">
              <h3 className="text-xl font-semibold mb-4">What's included</h3>
              <div className="space-y-3 text-left">
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-300" />
                  <span className="text-gray-200">
                    Access to all course materials
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-300" />
                  <span className="text-gray-200">
                    Progress tracking & analytics
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-300" />
                  <span className="text-gray-200">
                    Professional certificates
                  </span>
                </div>
                {accountType === "corporate" && (
                  <>
                    <div className="flex items-center space-x-3">
                      <Check className="w-5 h-5 text-green-300" />
                      <span className="text-gray-200">
                        Team management tools
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Check className="w-5 h-5 text-green-300" />
                      <span className="text-gray-200">Advanced reporting</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="text-sm text-gray-300">
              {accountType === "individual"
                ? "Start free, upgrade anytime"
                : "Annual subscription • Up to 200 employees"}
            </div>
          </div>
        </div>

        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
      </div>
    </div>
  );
}
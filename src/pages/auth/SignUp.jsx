// src/pages/auth/SignUp.jsx
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/hooks/auth/useAuth";
import SignupForm from "@/components/auth/SignupForm";
import { User, Building, Check } from "lucide-react";
import AuthSplitLayout from "@/components/auth/AuthSplitLayout";
import PageTitle from "@/components/layout/PageTitle";

export default function Signup() {
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState("individual");
  const { isAuthenticated } = useAuth();

  const handleSignupSuccess = (data) => {
    navigate(`/verify-email?email=${encodeURIComponent(data.email)}`, {
      replace: true,
      state: { email: data.email, accountType },
    });
  };

  if (isAuthenticated) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return (
    <AuthSplitLayout>
      <PageTitle
        as="h2"
        align="left"
        size="compact"
        title="Create your account"
        subtitleWrapperClassName="mt-0.5 text-xs text-text-light sm:text-sm"
        className="mb-0"
      />

      <div className="space-y-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-text-muted sm:text-sm sm:normal-case sm:tracking-normal sm:text-text-dark">
          Account type
        </h3>

        <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={() => setAccountType("individual")}
            className={`relative rounded-lg border px-2.5 py-2.5 text-left transition-all sm:px-3 sm:py-3 ${
              accountType === "individual"
                ? "border-primary bg-primary-light ring-2 ring-primary/20"
                : "border-background-dark hover:border-primary-light"
            }`}
          >
            <div className="flex items-center gap-2 sm:gap-2.5">
              <User className="h-4 w-4 shrink-0 text-primary sm:h-5 sm:w-5" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-text-dark sm:text-sm">
                  Individual
                </p>
                <p className="hidden text-[11px] text-text-light sm:block">
                  Personal use
                </p>
              </div>
              {accountType === "individual" && (
                <Check className="h-3.5 w-3.5 shrink-0 text-primary sm:h-4 sm:w-4" />
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setAccountType("corporate")}
            className={`relative rounded-lg border px-2.5 py-2.5 text-left transition-all sm:px-3 sm:py-3 ${
              accountType === "corporate"
                ? "border-primary bg-primary-light ring-2 ring-primary/20"
                : "border-background-dark hover:border-primary-light"
            }`}
          >
            <div className="flex items-center gap-2 sm:gap-2.5">
              <Building className="h-4 w-4 shrink-0 text-primary sm:h-5 sm:w-5" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-text-dark sm:text-sm">
                  Corporate
                </p>
                <p className="hidden text-[11px] text-text-light sm:block">
                  Up to 200 seats
                </p>
              </div>
              {accountType === "corporate" && (
                <Check className="h-3.5 w-3.5 shrink-0 text-primary sm:h-4 sm:w-4" />
              )}
            </div>
          </button>
        </div>
      </div>

      <SignupForm accountType={accountType} onSuccess={handleSignupSuccess} />

      <div className="space-y-2 text-center">
        <p className="text-xs sm:text-sm">
          <span className="text-text-light">Already have an account? </span>
          <Link
            to="/login"
            className="font-medium text-primary hover:text-primary-dark transition-colors"
          >
            Sign in
          </Link>
        </p>
        <p className="text-[11px] leading-snug text-text-light sm:text-xs">
          By signing up you agree to our{" "}
          <Link to="/terms" className="text-primary hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </AuthSplitLayout>
  );
}

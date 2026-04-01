// src/pages/auth/Login.jsx
import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/auth/useAuth";
import LoginForm from "@/components/auth/LoginForm";
import AuthSplitLayout from "@/components/auth/AuthSplitLayout";
import PageTitle from "@/components/layout/PageTitle";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const from = location.state?.from?.pathname || "/app/dashboard";

  const handleLoginSuccess = () => {
    navigate(from, { replace: true });
  };

  if (isAuthenticated) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return (
    <AuthSplitLayout>
      <PageTitle
        as="h2"
        align="left"
        title="Welcome back"
        subtitleWrapperClassName="mt-2 text-sm text-text-light"
        className="mb-0"
      />

      <LoginForm onSuccess={handleLoginSuccess} />

      <div className="text-center space-y-4">
        <p className="text-sm">
          <span className="text-text-light">Don&apos;t have an account? </span>
          <Link
            to="/signup"
            className="font-medium text-primary hover:text-primary-dark transition-colors"
          >
            Sign up here
          </Link>
        </p>
        <p className="text-sm">
          <Link
            to="/forgot-password"
            className="text-text-light hover:text-primary transition-colors"
          >
            Forgot your password?
          </Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
}

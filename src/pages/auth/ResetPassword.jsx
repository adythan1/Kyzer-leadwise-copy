// src/pages/auth/ResetPassword.jsx (Fixed - no zodResolver)
import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { BookOpen, ArrowLeft, Mail, Loader2 } from "lucide-react";
import { useAuth } from "../../hooks/auth/useAuth";
import toast from "react-hot-toast";
import PageTitle from "@/components/layout/PageTitle";

const ResetPassword = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { resetPassword, loading } = useAuth();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data) => {
    try {
      const result = await resetPassword(data.email);

      if (result.error) {
        toast.error(result.error.message || "Failed to send reset email");
        return;
      }

      setIsSubmitted(true);
      toast.success("Password reset email sent!");
    } catch {
      toast.error("An unexpected error occurred");
    }
  };

  const isLoading = loading || isSubmitting;

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <PageTitle
              as="h2"
              align="center"
              title="Check your email"
              subtitle={
                <>
                  We've sent a password reset link to{" "}
                  <span className="font-medium text-text-dark">
                    {getValues("email")}
                  </span>
                </>
              }
              subtitleWrapperClassName="mt-4 text-text-medium"
            />
          </div>

          <div className="bg-background-medium rounded-lg p-4 border border-background-dark">
            <h3 className="font-medium text-text-dark mb-2">
              Didn't receive the email?
            </h3>
            <ul className="text-sm text-text-medium space-y-1">
              <li>• Check your spam folder</li>
              <li>• Make sure you entered the correct email address</li>
              <li>• Wait a few minutes for the email to arrive</li>
            </ul>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setIsSubmitted(false)}
              className="w-full flex justify-center items-center py-3 px-4 border border-primary 
                       rounded-lg text-sm font-medium text-primary hover:bg-primary-light 
                       focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/20
                       transition-colors"
            >
              Try a different email
            </button>

            <div className="text-center">
              <Link
                to="/login"
                className="text-sm text-primary hover:text-primary-dark font-medium transition-colors"
              >
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center">
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">K</span>
              </div>
            </div>
          </div>
          <PageTitle
            as="h2"
            align="center"
            title="Reset your password"
            subtitle="Enter your email address and we'll send you a link to reset your password"
            subtitleWrapperClassName="mt-2 text-sm text-text-light"
          />
        </div>

        {/* Form */}
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-text-dark mb-2"
            >
              Email address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-text-light" />
              </div>
              <input
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Please enter a valid email address",
                  },
                })}
                type="email"
                id="email"
                autoComplete="email"
                disabled={isLoading}
                className={`
                  block w-full pl-10 pr-3 py-3 border rounded-lg 
                  placeholder-text-muted text-text-dark
                  focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                  disabled:bg-background-medium disabled:cursor-not-allowed
                  transition-colors
                  ${
                    errors.email
                      ? "border-red-300 bg-red-50"
                      : "border-background-dark bg-white hover:border-primary-light"
                  }
                `}
                placeholder="Enter your email address"
              />
            </div>
            {errors.email && (
              <p className="mt-2 text-sm text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`
              w-full flex justify-center items-center py-3 px-4 border border-transparent 
              rounded-lg shadow-sm text-sm font-medium text-white 
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/20
              transition-all duration-200
              ${
                isLoading
                  ? "bg-primary/70 cursor-not-allowed"
                  : "bg-primary hover:bg-primary-dark hover:shadow-md transform hover:-translate-y-0.5"
              }
            `}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending reset link...
              </>
            ) : (
              "Send reset link"
            )}
          </button>

          <div className="text-center">
            <Link
              to="/login"
              className="inline-flex items-center text-sm text-primary hover:text-primary-dark font-medium transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to sign in
            </Link>
          </div>
        </form>

        {/* Help text */}
        <div className="bg-background-medium rounded-lg p-4 border border-background-dark">
          <h3 className="font-medium text-text-dark mb-2">Need help?</h3>
          <p className="text-sm text-text-light">
            If you're having trouble resetting your password, please contact our
            support team at{" "}
            <a
              href="mailto:support@kyzer.com"
              className="text-primary hover:text-primary-dark transition-colors"
            >
              support@kyzer.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

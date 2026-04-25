// src/components/auth/SignupForm.jsx - ENHANCED WITH EMAIL VALIDATION
import { useState } from "react";
import { clsx } from "clsx";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/auth/useAuth";
import { Button, Input } from "@/components/ui";
import { Eye, EyeOff, AlertCircle, Clock, CheckCircle, X } from "lucide-react";
import toast from "react-hot-toast";
import { apiPost } from "@/lib/apiClient";

// Validation schemas (same as before)
const individualSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const corporateSchema = individualSchema.extend({
  jobTitle: z.string().min(1, "Job title is required"),
  companyName: z.string().min(1, "Company name is required"),
  employeeCount: z.string().min(1, "Please select company size"),
});

export default function SignupForm({ accountType, onSuccess }) {
  const { signup } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  
  // ✅ NEW: Email validation states
  const [emailCheckStatus, setEmailCheckStatus] = useState('idle'); // 'idle', 'checking', 'available', 'taken'
  const [emailCheckTimeout, setEmailCheckTimeout] = useState(null);

  const schema = accountType === 'corporate' ? corporateSchema : individualSchema;

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setError,
    clearErrors
  } = useForm({
    resolver: zodResolver(schema),
    mode: "onBlur"
  });

  const password = watch("password", "");
  const emailValue = watch("email", "");

  // ✅ NEW: Check if email exists (debounced)
  const checkEmailAvailability = async (email) => {
    if (!email || !email.includes('@')) {
      setEmailCheckStatus('idle');
      return;
    }

    setEmailCheckStatus('checking');
    
    try {
      const result = await apiPost('/auth/check-email', { email });
      const emailExists = result?.exists === true;

      if (emailExists) {
        setEmailCheckStatus('taken');
        setError('email', { 
          type: 'manual', 
          message: 'This email is already registered. Try signing in instead.' 
        });
      } else {
        setEmailCheckStatus('available');
        clearErrors('email');
      }
    } catch (_error) {
      setEmailCheckStatus('idle');
    }
  };

  // ✅ NEW: Debounced email checking
  const handleEmailChange = (e) => {
    const email = e.target.value;
    
    // Clear previous timeout
    if (emailCheckTimeout) {
      clearTimeout(emailCheckTimeout);
    }

    // Reset status
    setEmailCheckStatus('idle');
    clearErrors('email');

    // Set new timeout for checking
    const timeoutId = setTimeout(() => {
      checkEmailAvailability(email);
    }, 1000); // Check after 1 second of no typing

    setEmailCheckTimeout(timeoutId);
  };

  const onSubmit = async (formData) => {
    
    // ✅ BLOCK SUBMISSION if email is taken
    if (emailCheckStatus === 'taken') {
      toast.error('Please use a different email address');
      return;
    }

    setIsLoading(true);
    setRateLimited(false);

    try {
      const signupData = {
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            account_type: accountType,
            job_title: formData.jobTitle || '',
            company_name: formData.companyName || '',
            employee_count: formData.employeeCount || '',
          }
        }
      };

      const result = await signup(signupData);

      if (result.error) {
        console.error('🔴 Signup error:', result.error);
        
        // ✅ ENHANCED: Handle various signup errors
        if (result.error.message?.includes('already registered') ||
            result.error.message?.includes('already been registered') ||
            result.error.message?.includes('email address not authorized') ||
            result.error.code === 'email_address_already_registered') {
          setError('email', { 
            type: 'manual', 
            message: 'This email is already registered. Please sign in instead or use a different email.' 
          });
          toast.error('Email already registered');
          return;
        }
        
        // Handle rate limiting
        if (result.error.type === 'RATE_LIMITED' || 
            result.error.message?.includes('rate') ||
            result.error.message?.includes('limit')) {
          setRateLimited(true);
          toast.error(
            'Hit email rate limit. Wait 1 hour, set up SMTP, or disable email confirmation for development.',
            { duration: 8000 }
          );
          return;
        }
        
        // Handle weak password
        if (result.error.message?.includes('weak password')) {
          setError('password', { 
            type: 'manual', 
            message: 'Password is too weak. Please choose a stronger password.' 
          });
          toast.error('Password is too weak');
          return;
        }

        // Generic error
        toast.error(result.error.message || 'Signup failed');
        return;
      }

      
      if (result.skipVerification) {
        toast.success('Account created successfully! (Development mode)');
        window.location.href = '/app/dashboard';
      } else {
        toast.success('Account created! Please check your email to verify your account.');
        
        if (onSuccess) {
          onSuccess({ email: formData.email });
        }
      }

    } catch (error) {
      console.error('🔴 Signup exception:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: '', color: '' };
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    const levels = [
      { label: 'Very Weak', color: 'bg-red-500' },
      { label: 'Weak', color: 'bg-orange-500' },
      { label: 'Fair', color: 'bg-yellow-500' },
      { label: 'Good', color: 'bg-blue-500' },
      { label: 'Strong', color: 'bg-green-500' }
    ];

    return { strength, ...levels[Math.min(strength, 4)] };
  };

  const passwordStrength = getPasswordStrength(password);

  const fieldInputClass = "py-1.5 text-sm";

  return (
    <div className="space-y-3">
      {rateLimited && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-2.5 sm:p-3">
          <div className="flex gap-2">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
            <div className="min-w-0 text-xs text-yellow-800">
              <p className="font-medium">Email rate limit</p>
              <p className="mt-0.5 text-yellow-700">
                Wait and retry, configure SMTP, or adjust email confirmation in Supabase.
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-dark sm:text-sm">
              First name
            </label>
            <Input
              {...register("firstName")}
              placeholder="John"
              error={errors.firstName?.message}
              disabled={isLoading}
              className={fieldInputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-dark sm:text-sm">
              Last name
            </label>
            <Input
              {...register("lastName")}
              placeholder="Doe"
              error={errors.lastName?.message}
              disabled={isLoading}
              className={fieldInputClass}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-text-dark sm:text-sm">
            Email
          </label>
          <div className="relative">
            <Input
              type="email"
              {...register("email", {
                onChange: handleEmailChange,
              })}
              placeholder="you@company.com"
              error={errors.email?.message}
              disabled={isLoading}
              className={clsx(
                fieldInputClass,
                emailCheckStatus === "available" && "border-green-500 focus:ring-green-500",
                emailCheckStatus === "taken" && "border-red-500 focus:ring-red-500",
              )}
            />

            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {emailCheckStatus === 'checking' && (
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              )}
              {emailCheckStatus === 'available' && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              {emailCheckStatus === 'taken' && (
                <X className="h-4 w-4 text-red-500" />
              )}
            </div>
          </div>
          
          {emailCheckStatus === "available" && !errors.email && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-green-600">
              <CheckCircle className="h-3.5 w-3.5 shrink-0" />
              Available
            </p>
          )}
          {emailCheckStatus === "taken" && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              Already registered—sign in or use another email.
            </p>
          )}
        </div>

        {accountType === "corporate" && (
          <>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-dark sm:text-sm">
                  Job title
                </label>
                <Input
                  {...register("jobTitle")}
                  placeholder="Your role"
                  error={errors.jobTitle?.message}
                  disabled={isLoading}
                  className={fieldInputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-text-dark sm:text-sm">
                  Company
                </label>
                <Input
                  {...register("companyName")}
                  placeholder="Company name"
                  error={errors.companyName?.message}
                  disabled={isLoading}
                  className={fieldInputClass}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-text-dark sm:text-sm">
                Company size
              </label>
              <select
                {...register("employeeCount")}
                className="w-full rounded-md border border-background-dark px-3 py-1.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isLoading}
              >
                <option value="">Select company size</option>
                <option value="1-10">1-10 employees</option>
                <option value="11-50">11-50 employees</option>
                <option value="51-200">51-200 employees</option>
              </select>
              {errors.employeeCount && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {errors.employeeCount.message}
                </p>
              )}
            </div>
          </>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-dark sm:text-sm">
              Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                {...register("password")}
                placeholder="8+ chars, upper, lower, number"
                error={errors.password?.message}
                disabled={isLoading}
                className={fieldInputClass}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-light hover:text-text-dark"
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {password ? (
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-background-medium">
                  <div
                    className={clsx(
                      "h-full max-w-full transition-all duration-300",
                      passwordStrength.color,
                    )}
                    style={{
                      width: `${(Math.min(passwordStrength.strength, 4) / 4) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] font-medium text-text-muted sm:text-xs">
                  {passwordStrength.label}
                </span>
              </div>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-dark sm:text-sm">
              Confirm password
            </label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                {...register("confirmPassword")}
                placeholder="Repeat password"
                error={errors.confirmPassword?.message}
                disabled={isLoading}
                className={fieldInputClass}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-light hover:text-text-dark"
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          loading={isLoading}
          disabled={isLoading || emailCheckStatus === "taken"}
        >
          {isLoading ? "Creating account…" : "Create account"}
        </Button>

        {import.meta.env.DEV &&
          import.meta.env.VITE_SKIP_EMAIL_CONFIRMATION === "true" && (
            <div className="rounded-md bg-blue-50 px-2 py-1.5 text-center text-[11px] text-blue-600 sm:px-3">
              Dev mode: email confirmation off
            </div>
          )}

        {accountType === "corporate" ? (
          <details className="rounded-md border border-background-dark bg-background-light text-[11px] text-text-light">
            <summary className="cursor-pointer list-none px-2.5 py-1.5 font-medium text-text-dark marker:content-none [&::-webkit-details-marker]:hidden">
              What&apos;s included with corporate
            </summary>
            <ul className="space-y-0.5 border-t border-background-dark px-2.5 py-1.5">
              <li>Up to 200 employees, reporting, bulk assigns</li>
            </ul>
          </details>
        ) : null}
      </form>
    </div>
  );
}
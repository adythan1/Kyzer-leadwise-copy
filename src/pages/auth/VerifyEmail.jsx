// src/pages/auth/VerifyEmail.jsx - NEW FILE
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/auth/useAuth";
import { Mail, RefreshCw, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import leadwiseLogo from "../../assets/images/leadwise.svg";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const { user, resendVerification, isAuthenticated } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const [lastResendTime, setLastResendTime] = useState(null);
  const [countdown, setCountdown] = useState(0);

  // Get email from URL params or current user
  const urlParams = new URLSearchParams(window.location.search);
  const emailFromUrl = urlParams.get('email');
  const userEmail = user?.email || emailFromUrl || '';

  // Redirect if already authenticated and verified
  useEffect(() => {
    if (isAuthenticated && user?.email_confirmed_at) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // Countdown timer for resend button
  useEffect(() => {
    let interval = null;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown(countdown - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdown]);

  const handleResendEmail = async () => {
    if (!userEmail) {
      toast.error('No email address found');
      return;
    }

    if (countdown > 0) {
      toast.error(`Please wait ${countdown} seconds before resending`);
      return;
    }

    setIsResending(true);

    try {
      const result = await resendVerification(userEmail);
      
      if (result.error) {
        toast.error(result.error.message || 'Failed to resend email');
      } else {
        toast.success('Verification email sent! Check your inbox.');
        setResendCount(resendCount + 1);
        setLastResendTime(new Date());
        setCountdown(60); // 60 second cooldown
      }
    } catch (error) {
      console.error('Resend error:', error);
      toast.error('Failed to resend email');
    } finally {
      setIsResending(false);
    }
  };

  const getEmailProvider = (email) => {
    if (!email) return null;
    
    const domain = email.split('@')[1]?.toLowerCase();
    
    const providers = {
      'gmail.com': { name: 'Gmail', url: 'https://mail.google.com' },
      'outlook.com': { name: 'Outlook', url: 'https://outlook.live.com' },
      'hotmail.com': { name: 'Outlook', url: 'https://outlook.live.com' },
      'yahoo.com': { name: 'Yahoo', url: 'https://mail.yahoo.com' },
      'icloud.com': { name: 'iCloud', url: 'https://www.icloud.com/mail' },
    };
    
    return providers[domain] || null;
  };

  const emailProvider = getEmailProvider(userEmail);

  return (
    <div className="min-h-screen bg-background-light flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img src={leadwiseLogo} alt="Leadwise Logo" className="h-8" />
          </div>
          
          <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          
          <h1 className="text-2xl font-bold text-text-dark mb-2">
            Check your email
          </h1>
          
          <p className="text-text-light">
            We sent a verification link to
          </p>
          
          {userEmail && (
            <p className="font-medium text-text-dark mt-1">
              {userEmail}
            </p>
          )}
        </div>

        {/* Instructions */}
        <div className="space-y-4 mb-8">
          <div className="bg-background-medium rounded-lg p-4">
            <h3 className="font-medium text-text-dark mb-2">
              What to do next:
            </h3>
            <ol className="text-sm text-text-light space-y-1 list-decimal list-inside">
              <li>Check your email inbox</li>
              <li>Look for an email from Leadwise Academy</li>
              <li>Click the verification link</li>
              <li>You'll be automatically signed in</li>
            </ol>
          </div>

          {/* Quick email access */}
          {emailProvider && (
            <div className="text-center">
              <a
                href={emailProvider.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 text-primary hover:text-primary-dark transition-colors"
              >
                <span>Open {emailProvider.name}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}
        </div>

        {/* Resend Section */}
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-text-light mb-4">
              Didn't receive an email?
            </p>
            
            <button
              onClick={handleResendEmail}
              disabled={isResending || countdown > 0}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : countdown > 0 ? (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Resend in {countdown}s</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Resend email</span>
                </>
              )}
            </button>
            
            {resendCount > 0 && (
              <p className="text-xs text-text-muted mt-2">
                Email sent {resendCount} time{resendCount > 1 ? 's' : ''}
                {lastResendTime && (
                  <span> (last sent at {lastResendTime.toLocaleTimeString()})</span>
                )}
              </p>
            )}
          </div>

          {/* Troubleshooting */}
          <div className="border-t pt-4">
            <details className="text-sm">
              <summary className="cursor-pointer text-text-light hover:text-text-dark">
                Still having trouble?
              </summary>
              <div className="mt-3 space-y-2 text-text-light">
                <p>• Check your spam/junk folder</p>
                <p>• Make sure {userEmail} is correct</p>
                <p>• Try adding noreply@yourdomain.com to your contacts</p>
                <p>• Contact support if the issue persists</p>
              </div>
            </details>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 pt-6 border-t">
          <p className="text-sm text-text-light">
            Want to use a different email?{' '}
            <Link
              to="/signup"
              className="text-primary hover:text-primary-dark font-medium"
            >
              Sign up again
            </Link>
          </p>
          
          <p className="text-sm text-text-light mt-2">
            Already verified?{' '}
            <Link
              to="/login"
              className="text-primary hover:text-primary-dark font-medium"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
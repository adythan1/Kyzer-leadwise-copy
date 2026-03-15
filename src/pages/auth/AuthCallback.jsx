// src/pages/auth/AuthCallback.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuth';
import { supabase } from '@/lib/supabase';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { createUserProfile, refreshUser } = useAuth();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        
        // Handle the auth callback (email verification or password reset)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('🔴 Session error:', sessionError);
          setStatus('error');
          setError('Authentication failed. Please try again.');
          toast.error('Authentication failed. Please try again.');
          
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 3000);
          return;
        }

        if (!session?.user) {
          setStatus('error');
          setError('No authentication session found.');
          
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 2000);
          return;
        }

         
        // Check if this is a password reset
        const type = searchParams.get('type');
        if (type === 'recovery') {
          toast.success('Please set your new password');
          navigate('/reset-password', { replace: true });
          return;
        }

        // Check if user already has a profile
        setStatus('checking-profile');
        const { data: existingProfile, error: profileCheckError } = await supabase
          .from('profiles')
          .select('id, account_type, organization_id')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profileCheckError && profileCheckError.code !== 'PGRST116') {
          console.error('🔴 Profile check error:', profileCheckError);
          throw profileCheckError;
        }

        if (existingProfile) {
          
          // Refresh user data and navigate to dashboard
          await refreshUser();
          
          toast.success('Welcome back!');
          navigate('/app/dashboard', { replace: true });
          return;
        }

        // Create profile for new user
        setStatus('creating-profile');
        
        const profile = await createUserProfile(session.user, session.user.user_metadata);
        
        if (profile) {
          
          // Refresh user data
          await refreshUser();
          
          // Show success message based on account type
          if (profile.account_type === 'corporate') {
            toast.success('Corporate account created! Your organization has been set up.');
          } else {
            toast.success('Welcome to Leadwise Academy!');
          }
          
          setStatus('success');
          
          // Navigate to dashboard after a brief delay
          setTimeout(() => {
            navigate('/app/dashboard', { replace: true });
          }, 1500);
        } else {
          throw new Error('Failed to create user profile');
        }

      } catch (error) {
        console.error('🔴 Auth callback error:', error);
        setStatus('error');
        setError(error.message || 'There was an issue setting up your account.');
        toast.error('There was an issue setting up your account. Please contact support.');
        
        setTimeout(() => {
          navigate('/signup', { replace: true });
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [searchParams, navigate, createUserProfile, refreshUser]);

  const getStatusContent = () => {
    switch (status) {
      case 'processing':
        return {
          icon: <Loader2 className="w-8 h-8 animate-spin text-primary" />,
          title: 'Verifying your account...',
          description: 'Please wait while we confirm your email address...'
        };
      case 'checking-profile':
        return {
          icon: <Loader2 className="w-8 h-8 animate-spin text-primary" />,
          title: 'Checking your profile...',
          description: 'Setting up your account details...'
        };
      case 'creating-profile':
        return {
          icon: <Loader2 className="w-8 h-8 animate-spin text-primary" />,
          title: 'Setting up your profile...',
          description: 'Creating your learning environment...'
        };
      case 'success':
        return {
          icon: <CheckCircle className="w-8 h-8 text-green-500" />,
          title: 'Account setup complete!',
          description: 'Redirecting you to your dashboard...'
        };
      case 'error':
        return {
          icon: <XCircle className="w-8 h-8 text-red-500" />,
          title: 'Setup failed',
          description: error || 'Something went wrong during account setup.'
        };
      default:
        return {
          icon: <Loader2 className="w-8 h-8 animate-spin text-primary" />,
          title: 'Processing...',
          description: 'Please wait...'
        };
    }
  };

  const { icon, title, description } = getStatusContent();

  return (
    <div className="min-h-screen bg-background-light flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-lg shadow-sm border border-background-dark p-8">
          <div className="flex justify-center mb-6">
            {icon}
          </div>
          
          <h2 className="text-xl font-semibold text-text-dark mb-3">
            {title}
          </h2>
          
          <p className="text-text-light mb-6">
            {description}
          </p>
          
          {status === 'error' && (
            <div>
              <button
                onClick={() => navigate('/signup', { replace: true })}
                className="text-primary hover:text-primary-dark text-sm font-medium"
              >
                Return to signup
              </button>
            </div>
          )}
          
          {(status === 'processing' || status === 'checking-profile' || status === 'creating-profile') && (
            <div className="mt-4">
              <div className="text-xs text-text-muted">
                This may take a few moments...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
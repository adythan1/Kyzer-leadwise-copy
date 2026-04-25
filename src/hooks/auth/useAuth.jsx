// src/hooks/auth/useAuth.jsx - UPDATED with Email Validation & Enhanced Error Handling
import { useState, useEffect, createContext, useContext, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { apiPost } from "@/lib/apiClient";
import toast from "react-hot-toast";

const AuthContext = createContext();

// Helper function to get the correct redirect URL for current environment
const getAuthRedirectURL = (path = '/auth/callback') => {
  const baseURL = import.meta.env.VITE_APP_URL || window.location.origin;
  return `${baseURL}${path}`;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Session lifetime enforcement (24 hours)
  const SESSION_START_KEY = 'kyzer_session_started_at';
  const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;
  const signoutTimerRef = useRef(null);

  const getSessionStart = useCallback(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(SESSION_START_KEY) : null;
      const parsed = raw ? parseInt(raw, 10) : null;
      return Number.isFinite(parsed) ? parsed : null;
    } catch (_) {
      return null;
    }
  }, []);

  const setSessionStartNow = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SESSION_START_KEY, String(Date.now()));
      }
    } catch (_) {
      // ignore storage errors
    }
  }, []);

  const clearSessionStart = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(SESSION_START_KEY);
      }
    } catch (_) {
      // ignore storage errors
    }
  }, []);

  // Safe error handler
  const handleError = useCallback((error, context = '') => {
    console.error(`Error in ${context}:`, error);
    
    if (error?.code === 'PGRST116') {
      return {
        type: 'NOT_FOUND',
        message: 'Resource not found',
        code: 'PGRST116'
      };
    }
    
    return {
      type: 'ERROR',
      message: error?.message || 'An error occurred',
      code: error?.code
    };
  }, []);

  // Load user profile
  const loadUserProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return;
    }

    setProfileLoading(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          organization:organization_id(
            id,
            name,
            slug,
            subscription_status,
            max_employees
          )
        `)
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Profile loading error:', error);
        setProfile(null);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Profile loading failed:', error);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // Auth initialization
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;

        // Handle session_not_found error - clear state if session doesn't exist
        if (error) {
          if (error.code === 'session_not_found' || 
              error.message?.includes('Session from session_id claim')) {
            // Session doesn't exist, clear local state
            setSession(null);
            setUser(null);
            setProfile(null);
            clearSessionStart();
            setLoading(false);
            return;
          }
        }
        
        
        setSession(session);
        setUser(session?.user || null);
        setLoading(false);
        
        if (session?.user) {
          loadUserProfile(session.user.id);
        } else {
          // No session, ensure state is cleared
          setProfile(null);
          clearSessionStart();
        }

      } catch (error) {
        console.error("🔴 Auth initialization error:", error);
        if (mounted) {
          setUser(null);
          setSession(null);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        
        if (!mounted) return;

        // Only update state if there's an actual change in user ID or session status
        const currentUserId = user?.id;
        const newUserId = session?.user?.id;
        const hasUserChanged = currentUserId !== newUserId;
        const hasSessionChanged = !session !== !user;

        if (hasUserChanged || hasSessionChanged || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          setSession(session);
          setUser(session?.user || null);

          // Manage session start marker on auth transitions
          if (event === 'SIGNED_IN' && session?.user) {
            setSessionStartNow();
          }
          if (event === 'SIGNED_OUT' || !session?.user) {
            clearSessionStart();
          }
          
          if (session?.user) {
            // Only load profile if user ID changed or this is a sign in event
            if (hasUserChanged || event === 'SIGNED_IN') {
              loadUserProfile(session.user.id);
            }
          } else {
            setProfile(null);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Enforce 24-hour maximum session lifetime
  useEffect(() => {
    // Clear any existing timer
    if (signoutTimerRef.current) {
      clearTimeout(signoutTimerRef.current);
      signoutTimerRef.current = null;
    }

    const performSignOut = async () => {
      try {
        await supabase.auth.signOut();
      } catch (_) {
        // swallow; UI will reflect unauth state regardless
      } finally {
        clearSessionStart();
        setProfile(null);
      }
    };

    // If there is an active session, schedule auto sign-out at 24h mark
    if (session?.user) {
      let startedAt = getSessionStart();
      if (!startedAt) {
        setSessionStartNow();
        startedAt = Date.now();
      }

      const elapsed = Date.now() - startedAt;
      const remaining = SESSION_DURATION_MS - elapsed;

      if (remaining <= 0) {
        performSignOut();
        return undefined;
      }

      signoutTimerRef.current = setTimeout(() => {
        performSignOut();
      }, remaining);
    } else {
      // No session: ensure marker cleared
      clearSessionStart();
    }

    return () => {
      if (signoutTimerRef.current) {
        clearTimeout(signoutTimerRef.current);
        signoutTimerRef.current = null;
      }
    };
  }, [session?.user, getSessionStart, setSessionStartNow, clearSessionStart]);

  // Login function
  const login = useCallback(async (email, password) => {
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });


      if (error) {
        console.error('🔴 Login error:', error);
        const handledError = handleError(error, 'login');
        return { error: handledError };
      }


      return { data };
      
    } catch (error) {
      console.error('🔴 Login exception:', error);
      const handledError = handleError(error, 'login');
      return { error: handledError };
    }
  }, [handleError]);
 // ✅ ENHANCED: Create user profile with better account_type handling
  const createUserProfile = useCallback(async (user, userData = {}) => {
    try {

      // ✅ CRITICAL: Proper account_type resolution
      const accountType = userData.account_type || user.user_metadata?.account_type || 'individual';

      const profileData = {
        id: user.id, // ✅ CRITICAL: This must be the auth user ID
        email: user.email,
        first_name: userData.first_name || user.user_metadata?.first_name || '',
        last_name: userData.last_name || user.user_metadata?.last_name || '',
        account_type: accountType, // ✅ Use resolved account type
        job_title: userData.job_title || user.user_metadata?.job_title || '',
        company_name: userData.company_name || user.user_metadata?.company_name || '',
        role: accountType === 'corporate' ? 'admin' : 'learner', // ✅ Set role based on account type
        status: 'active',
        auth_user_id: user.id // ✅ CRITICAL: Explicit auth user reference
      };


      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert([profileData])
        .select()
        .single();

      if (profileError) {
        console.error('🔴 Profile creation error:', profileError);
        throw profileError;
      }


      // Handle corporate organization creation if needed
      if (profileData.account_type === 'corporate') {
        await createOrganizationForUser(user.id, {
          ...userData,
          ...user.user_metadata,
          email: user.email
        });
      }

      return profile;

    } catch (error) {
      console.error('🔴 Profile creation failed:', error);
      throw error;
    }
  }, []);

// Fixed signup function - replace the one in your useAuth.jsx
const signup = useCallback(async (userData) => {
  try {
   

    const redirectURL = getAuthRedirectURL('/auth/callback');

    const signupData = {
      email: userData.email,
      password: userData.password,
      options: {
        emailRedirectTo: redirectURL,
        data: {
          first_name: userData.options?.data?.first_name || '',
          last_name: userData.options?.data?.last_name || '',
          account_type: userData.options?.data?.account_type || 'individual',
          job_title: userData.options?.data?.job_title || '',
          company_name: userData.options?.data?.company_name || '',
          employee_count: userData.options?.data?.employee_count || '',
        }
      }
    };


    const { data: authData, error: authError } = await supabase.auth.signUp(signupData);

    if (authError) {
      console.error('🔴 Auth signup error:', authError);
      
      // ✅ FIXED: Proper error handling
      const errorMessage = authError.message?.toLowerCase() || '';
      const errorCode = authError.code || '';

      // Check for duplicate email errors
      if (
        errorMessage.includes('already registered') ||
        errorMessage.includes('already been registered') ||
        errorMessage.includes('user already registered') ||
        errorMessage.includes('email address not authorized') ||
        errorMessage.includes('email not confirmed') ||
        errorCode === 'email_address_already_registered' ||
        errorCode === 'user_already_registered' ||
        errorCode === 'signup_disabled'
      ) {
        return { 
          error: {
            type: 'EMAIL_ALREADY_EXISTS',
            message: 'This email address is already registered. Please sign in instead or use a different email.',
            code: 'EMAIL_DUPLICATE'
          }
        };
      }

      // Check for rate limiting
      if (
        errorMessage.includes('rate') || 
        errorMessage.includes('limit') ||
        errorMessage.includes('quota') ||
        errorMessage.includes('too many requests') ||
        errorCode === 'over_email_send_rate_limit'
      ) {
        return { 
          error: {
            type: 'RATE_LIMITED',
            message: 'Too many signup attempts. Please wait 1 hour or contact support.',
            code: 'RATE_LIMITED'
          }
        };
      }

      // Check for invalid email format
      if (
        errorMessage.includes('invalid email') ||
        errorMessage.includes('email format') ||
        errorCode === 'invalid_email'
      ) {
        return { 
          error: {
            type: 'INVALID_EMAIL',
            message: 'Please enter a valid email address.',
            code: 'INVALID_EMAIL'
          }
        };
      }

      // Check for weak password
      if (
        errorMessage.includes('password') ||
        errorMessage.includes('weak') ||
        errorCode === 'weak_password'
      ) {
        return { 
          error: {
            type: 'WEAK_PASSWORD',
            message: 'Password is too weak. Please choose a stronger password.',
            code: 'WEAK_PASSWORD'
          }
        };
      }

      // Generic error handling
      const handledError = handleError(authError, 'signup');
      return { error: handledError };
    }

   

    // ✅ DEBUG: Verify user metadata contains account_type

    // 🚀 Create profile immediately if email is confirmed (instant confirmation)
    if (authData.user && authData.user.email_confirmed_at) {
      
      try {
        const profile = await createUserProfile(authData.user, signupData.options.data);
        
        return { 
          data: authData,
          profile: profile,
          message: 'Account created and profile set up successfully!'
        };
      } catch (profileError) {
        console.error('🔴 Profile creation during signup failed:', profileError);
        // Continue with signup success even if profile creation fails
        // Profile will be created later in auth callback
      }
    }

    return { 
      data: authData,
      message: 'Account created! Please check your email to verify your account.'
    };

  } catch (error) {
    console.error('🔴 Signup error:', error);
    const handledError = handleError(error, 'signup');
    return { error: handledError };
  }
}, [handleError, createUserProfile]);
 
  // Organization creation helper
  const createOrganizationForUser = async (userId, userData) => {
    try {

      const companyName = userData.company_name || 'Unnamed Company';
      const slug = companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') + '-' + Date.now();

      const orgData = {
        name: companyName,
        slug: slug,
        email: userData.email,
        max_employees: userData.employee_count === '1-10' ? 10 :
                     userData.employee_count === '11-50' ? 50 :
                     userData.employee_count === '51-200' ? 200 : 10,
        subscription_status: 'trial'
      };

      const { data: orgResult, error: orgError } = await supabase
        .from('organizations')
        .insert([orgData])
        .select()
        .single();

      if (orgError) {
        throw orgError;
      }

      // Update profile with organization reference
      await supabase
        .from('profiles')
        .update({ 
          organization_id: orgResult.id,
          company_id: orgResult.id 
        })
        .eq('id', userId);

      // Add user as organization owner (creator)
      await supabase
        .from('organization_members')
        .insert([{
          organization_id: orgResult.id,
          user_id: userId,
          role: 'owner',
          status: 'active',
          joined_at: new Date().toISOString()
        }]);

      return orgResult;

    } catch (error) {
      console.error('🔴 Organization creation error:', error);
      // Don't throw - let signup succeed even if org creation fails
    }
  };

  // ✅ NEW: Email checking function
  const checkEmailExists = useCallback(async (email) => {
    try {
      const result = await apiPost('/auth/check-email', { email });
      return {
        exists: result?.exists === true,
        functionMissing: result?.functionMissing === true,
      };
    } catch (_error) {
      return { error: 'Failed to check email availability' };
    }
  }, []);

  // Password reset function
  const resetPassword = useCallback(async (email) => {
    try {
      const redirectURL = getAuthRedirectURL('/auth/callback?type=recovery');
      
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectURL
      });
      
      if (error) {
        const handledError = handleError(error, 'password-reset');
        return { error: handledError };
      }
      
      return { data };
    } catch (error) {
      const handledError = handleError(error, 'password-reset');
      return { error: handledError };
    }
  }, [handleError]);

  // Resend verification email
  const resendVerification = useCallback(async (email) => {
    try {
      const redirectURL = getAuthRedirectURL('/auth/callback');
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: redirectURL
        }
      });
      
      if (error) {
        const handledError = handleError(error, 'resend-verification');
        return { error: handledError };
      }
      
      return { success: true };
    } catch (error) {
      const handledError = handleError(error, 'resend-verification');
      return { error: handledError };
    }
  }, [handleError]);

  // Sign out function
  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      // If error is session-related, it's fine - user is already logged out
      const isSessionError = error?.code === 'session_not_found' || 
                           error?.message?.includes('Auth session missing') ||
                           error?.message?.includes('Session from session_id claim');
      
      if (error && !isSessionError) {
        const handledError = handleError(error, 'signout');
        return { error: handledError };
      }

      // Clear lifetime tracking and timer
      clearSessionStart();
      if (signoutTimerRef.current) {
        clearTimeout(signoutTimerRef.current);
        signoutTimerRef.current = null;
      }

      setProfile(null);
      setUser(null);
      setSession(null);
      
      return { success: true };
    } catch (error) {
      // If it's a session error, treat as success (already logged out)
      const isSessionError = error?.code === 'session_not_found' || 
                           error?.message?.includes('Auth session missing') ||
                           error?.message?.includes('Session from session_id claim');
      
      if (isSessionError) {
        clearSessionStart();
        if (signoutTimerRef.current) {
          clearTimeout(signoutTimerRef.current);
          signoutTimerRef.current = null;
        }
        setProfile(null);
        setUser(null);
        setSession(null);
        return { success: true };
      }
      const handledError = handleError(error, 'signout');
      return { error: handledError };
    }
  }, [handleError, clearSessionStart]);

  // Refresh user profile
  const refreshUser = useCallback(async () => {
    if (!user?.id) return;
    await loadUserProfile(user.id);
  }, [user?.id, loadUserProfile]);

  const value = {
    user,
    session,
    profile,
    loading,
    profileLoading,
    isAuthenticated: !!user,
    hasProfile: !!profile,
    login,
    signup,
    signOut,
    resetPassword,
    refreshUser,
    loadUserProfile,
    resendVerification,
    createUserProfile,
    checkEmailExists, // ✅ NEW: Email checking function
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
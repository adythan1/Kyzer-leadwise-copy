// src/lib/supabase.js - Updated with environment-aware redirects for email verification
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Service role client for operations that need to bypass RLS
// IMPORTANT: Service Role keys must NEVER be bundled into client-side code.
// Only create the service client when running in a server/SSR environment.
// Vite exposes `import.meta.env.SSR` which is true for server-side execution.
export const supabaseService = (import.meta.env.SSR && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// ==========================================
// 🚀 NEW: ENVIRONMENT DETECTION HELPERS
// ==========================================

// Get the correct base URL for current environment
export const getBaseURL = () => {
  
  // For production/staging - use environment variable or current origin
  return import.meta.env.VITE_APP_URL || window.location.origin;
};

// Generate environment-aware auth redirect URLs
export const getAuthRedirectURL = (path = '/auth/callback') => {
  const baseURL = getBaseURL();
  return `${baseURL}${path}`;
};

// ==========================================
// 🔧 UPDATED: Enhanced Supabase Client Config
// ==========================================

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    // Reduce refresh frequency to prevent unnecessary auth state changes
    refreshTokenMargin: 60, // Refresh 60 seconds before expiry instead of default
    // 🆕 Add default redirect configuration
    redirectTo: getAuthRedirectURL('/auth/callback')
  },
  global: {
    headers: {
      'X-Client-Info': 'kyzer-lms@1.0.0',
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// ==========================================
// TABLE CONSTANTS - Keep your existing ones
// ==========================================
export const TABLES = {
  // User and Auth related
  PROFILES: 'profiles',
  
  // Course related
  COURSES: 'courses',
  COURSE_MODULES: 'course_modules',
  LESSONS: 'lessons',
  COURSE_ENROLLMENTS: 'course_enrollments',
  COURSE_WISHLIST: 'course_wishlist',
  LESSON_PROGRESS: 'lesson_progress',
  
  // Quiz and Assessment
  QUIZZES: 'quizzes',
  QUIZ_QUESTIONS: 'quiz_questions',
  QUIZ_ATTEMPTS: 'quiz_attempts',
  
  // Corporate/Organization
  ORGANIZATIONS: 'organizations',
  ORGANIZATION_MEMBERS: 'organization_members',
  COMPANIES: 'companies',
  COMPANY_EMPLOYEES: 'company_employees',
  COMPANY_DEPARTMENTS: 'company_departments',
  EMPLOYEE_DEPARTMENTS: 'employee_departments',
  COMPANY_COURSE_ASSIGNMENTS: 'company_course_assignments',
  COMPANY_EMPLOYEE_COURSE_ASSIGNMENTS: 'company_employee_course_assignments',
  EMPLOYEE_INVITATIONS: 'employee_invitations',
  
  // Categories
  COURSE_CATEGORIES: 'course_categories',
  
  // Certificates
  CERTIFICATES: 'certificates',
  CERTIFICATE_TEMPLATES: 'certificate_templates',
  
  // Presentation/Lesson Curation
  LESSON_PRESENTATIONS: 'lesson_presentations',
  PRESENTATION_SLIDES: 'presentation_slides',

  // Progress Tracking
  SLIDE_PROGRESS: 'slide_progress',
  PRESENTATION_PROGRESS: 'presentation_progress',
  
  // Profile views
  USER_PROFILES: 'user_profiles',
  COMPANY_MEMBERSHIPS: 'company_memberships',
  
  // Reviews
  COURSE_REVIEWS: 'course_reviews',

  // Course community / discussion (enrolled learners only, RLS)
  COURSE_DISCUSSION_POSTS: 'course_discussion_posts',
};

// ==========================================
// SAFE QUERY HELPERS - Keep your existing timeout logic
// ==========================================

export const createSafeQuery = (table, timeoutMs = 10000) => {
  const query = supabase.from(table);
  
  const executeWithTimeout = async (queryPromise) => {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Query timeout after ${timeoutMs}ms`)), timeoutMs)
    );
    
    try {
      return await Promise.race([queryPromise, timeoutPromise]);
    } catch (error) {
      console.error(`Query timeout or error on table ${table}:`, error);
      throw error;
    }
  };

  const originalSelect = query.select.bind(query);
  query.select = function(...args) {
    const selectQuery = originalSelect(...args);
    const originalSingle = selectQuery.single;
    
    if (originalSingle) {
      selectQuery.single = function() {
        const singleQuery = originalSingle.call(this);
        const originalThen = singleQuery.then;
        
        singleQuery.then = function(onResolve, onReject) {
          return executeWithTimeout(originalThen.call(this, onResolve, onReject));
        };
        
        return singleQuery;
      };
    }
    
    return selectQuery;
  };
  
  return query;
};

// ==========================================
// UPDATED AUTH HELPERS - Keep your timeout logic
// ==========================================

export const getCurrentUser = async (timeoutMs = 5000) => {
  try {
    const authPromise = supabase.auth.getUser();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Auth timeout')), timeoutMs)
    );

    const { data: { user }, error } = await Promise.race([authPromise, timeoutPromise]);
    if (error) {
      console.error('Auth error:', error);
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

export const getUserProfile = async (userId = null, timeoutMs = 8000) => {
  try {
    let targetUserId = userId;
    
    if (!targetUserId) {
      const user = await getCurrentUser();
      if (!user) return null;
      targetUserId = user.id;
    }

    const profilePromise = supabase
      .from(TABLES.PROFILES)
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
      .eq('id', targetUserId)
      .single();

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Profile query timeout')), timeoutMs)
    );

    const { data, error } = await Promise.race([profilePromise, timeoutPromise]);

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Profile query error:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

export const getSession = async (timeoutMs = 5000) => {
  try {
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Session timeout')), timeoutMs)
    );

    const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);
    
    if (error) {
      console.error('Session error:', error);
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
};

// ==========================================
// IMPROVED ERROR HANDLING - Keep your existing logic
// ==========================================

export const handleSupabaseError = (error, _context = '') => {
  if (error?.message?.includes('timeout')) {
    return {
      type: 'TIMEOUT',
      message: 'Request timed out. Please try again.',
      code: 'TIMEOUT'
    };
  }
  
  if (isAuthError(error)) {
    return {
      type: 'AUTH_ERROR',
      message: 'Authentication required. Please log in again.',
      code: error.code
    };
  }
  
  if (isPermissionError(error)) {
    return {
      type: 'PERMISSION_ERROR',
      message: 'You do not have permission to perform this action.',
      code: error.code
    };
  }
  
  if (error?.code === 'PGRST116') {
    return {
      type: 'NOT_FOUND',
      message: 'No data found.',
      code: 'PGRST116'
    };
  }
  
  if (error?.code === '23505') {
    return {
      type: 'DUPLICATE',
      message: 'This record already exists.',
      code: '23505'
    };
  }
  
  if (error?.code === '23503') {
    return {
      type: 'FOREIGN_KEY',
      message: 'Cannot delete this record as it is being used elsewhere.',
      code: '23503'
    };
  }
  
  return {
    type: 'UNKNOWN',
    message: error?.message || 'An unexpected error occurred.',
    code: error?.code || 'UNKNOWN'
  };
};

export const safeQuery = async (queryPromise, context = '', timeoutMs = 10000) => {
  try {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Query timeout in ${context}`)), timeoutMs)
    );

    const result = await Promise.race([queryPromise, timeoutPromise]);
    
    if (result.error) {
      const handledError = handleSupabaseError(result.error, context);
      return { data: null, error: handledError };
    }
    
    return { data: result.data, error: null };
  } catch (error) {
    const handledError = handleSupabaseError(error, context);
    return { data: null, error: handledError };
  }
};

// ==========================================
// STORAGE AND OTHER HELPERS - Keep as-is
// ==========================================

export const STORAGE_BUCKETS = {
  COURSE_CONTENT: 'course-content',
  AVATARS: 'avatars',
  CERTIFICATES: 'certificates',
  ORGANIZATION_LOGOS: 'organization-logos',
  COURSE_THUMBNAILS: 'course-thumbnails'
};

export const createQuery = (table) => {
  return supabase.from(table);
};

export const isAuthError = (error) => {
  return error?.message?.includes('JWT') || 
         error?.message?.includes('auth') ||
         error?.code === 'PGRST301';
};

export const isPermissionError = (error) => {
  return error?.code === 'PGRST106' || 
         error?.message?.includes('permission');
};

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateFileType = (file, allowedTypes) => {
  return allowedTypes.includes(file.type);
};

export const validateFileSize = (file, maxSizeInMB) => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
};

// ==========================================
// FILE UPLOAD HELPERS - Keep as-is
// ==========================================

export const uploadFile = async (bucket, path, file, options = {}) => {
  try {
    // Validate file exists
    if (!file) {
      throw new Error('No file provided for upload');
    }

    // Validate bucket exists
    if (!bucket) {
      throw new Error('No storage bucket specified');
    }

    // Validate path is a string
    if (typeof path !== 'string') {
      throw new Error('Path must be a string');
    }

    // Sanitize path and add timestamp to avoid duplicates
    const sanitizedPath = path.replace(/[^a-zA-Z0-9\-_./]/g, '_');
    const timestamp = Date.now();
    const pathParts = sanitizedPath.split('/');
    const fileName = pathParts.pop();
    
    if (!fileName || !fileName.includes('.')) {
      // If no filename or extension, create one from file name
      const originalName = file.name || 'file';
      const fileExt = originalName.split('.').pop() || 'bin';
      let fileNameWithoutExt = originalName.replace(/\.[^/.]+$/, '') || 'upload';
      
      // Sanitize filename: remove special characters, replace spaces with underscores
      fileNameWithoutExt = fileNameWithoutExt
        .replace(/[^a-zA-Z0-9\-_]/g, '_')
        .replace(/\s+/g, '_')
        .replace(/_{2,}/g, '_')
        .substring(0, 100); // Limit length
      
      const uniqueFileName = `${fileNameWithoutExt}_${timestamp}.${fileExt}`;
      const uniquePath = [...pathParts, uniqueFileName].join('/');
      
      const contentType = file.type || 'application/octet-stream';
      
      // Use service role client if available to bypass RLS
      const client = supabaseService || supabase;
      
      const { data, error } = await client.storage
        .from(bucket)
        .upload(uniquePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType,
          ...options
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }
      
      return data;
    }
    
    const fileExt = fileName.split('.').pop();
    let fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    
    // Sanitize filename: remove special characters, replace spaces with underscores
    fileNameWithoutExt = fileNameWithoutExt
      .replace(/[^a-zA-Z0-9\-_]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 100); // Limit length
    
    // Create unique filename with timestamp
    const uniqueFileName = `${fileNameWithoutExt}_${timestamp}.${fileExt}`;
    const uniquePath = [...pathParts, uniqueFileName].join('/');
    
    const contentType = file.type || 'application/octet-stream';
    
    // Use service role client if available to bypass RLS
    const client = supabaseService || supabase;
    
    const { data, error } = await client.storage
      .from(bucket)
      .upload(uniquePath, file, {
        cacheControl: '3600',
        upsert: true, // Allow overwriting
        contentType,
        ...options
      });

    if (error) {
      console.error('Storage upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }
    
    return data;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

export const getFileUrl = (bucket, path) => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  
  return data.publicUrl;
};

export const deleteFile = async (bucket, path) => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

// ==========================================
// PAGINATION HELPERS - Keep as-is
// ==========================================

export const createPaginatedQuery = (table, {
  page = 1,
  limit = 25,
  orderBy = 'created_at',
  ascending = false,
  select = '*'
} = {}) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  return supabase
    .from(table)
    .select(select, { count: 'exact' })
    .range(from, to)
    .order(orderBy, { ascending });
};

// ==========================================
// 🔧 UPDATED: Auth helpers with dynamic redirects
// ==========================================

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

// 🚀 FIXED: Now uses environment-aware redirect URL
export const resetPassword = async (email) => {
  try {
    const redirectTo = getAuthRedirectURL('/auth/callback?type=recovery');
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo
    });
    
    if (error) throw error;
  } catch (error) {
    console.error('Error resetting password:', error);
    throw error;
  }
};

// 🆕 NEW: Additional auth helpers for email verification
export const resendConfirmation = async (email) => {
  try {
    const redirectTo = getAuthRedirectURL('/auth/callback?type=signup');
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: redirectTo
      }
    });
    
    if (error) throw error;
  } catch (error) {
    console.error('Error resending confirmation:', error);
    throw error;
  }
};

// Export default client
export default supabase;
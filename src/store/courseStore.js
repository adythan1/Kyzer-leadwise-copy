// src/store/courseStore.js
import { create } from 'zustand';
import { supabase, TABLES, safeQuery, getUserProfile } from '@/lib/supabase';
import { isMissingSchemaColumnError } from '@/utils/certificateUtils';

const CERT_TEMPLATE_CORE_KEYS = [
  'name',
  'description',
  'template_url',
  'placeholders',
  'is_default',
];
const CERT_TEMPLATE_EXTENDED_KEYS = ['theme', 'logo_url', 'logo_position', 'theme_colors'];

function buildCertificateTemplateInsert(templateData, includeExtended) {
  const row = {
    name: templateData.name,
    description: templateData.description,
    template_url: templateData.template_url,
    placeholders: templateData.placeholders || {},
    is_default: templateData.is_default || false,
    created_by: templateData.created_by,
    created_at: new Date().toISOString(),
  };
  if (includeExtended) {
    const logo = templateData.logo_url;
    row.theme = templateData.theme || 'gallery';
    row.logo_url = logo && String(logo).trim() !== '' ? logo : null;
    row.logo_position = templateData.logo_position || 'top-left';
    row.theme_colors = templateData.theme_colors ?? null;
  }
  return row;
}

function buildCertificateTemplateUpdatePayload(updates, includeExtended) {
  const keys = includeExtended
    ? [...CERT_TEMPLATE_CORE_KEYS, ...CERT_TEMPLATE_EXTENDED_KEYS]
    : CERT_TEMPLATE_CORE_KEYS;
  const filtered = {};
  for (const key of keys) {
    if (key in updates) filtered[key] = updates[key];
  }
  if (Object.prototype.hasOwnProperty.call(filtered, 'logo_url') && filtered.logo_url === '') {
    filtered.logo_url = null;
  }
  filtered.updated_at = new Date().toISOString();
  return filtered;
}

// Helper function to check if error is a table not found error
const isTableNotFoundError = (error) => {
  if (!error) return false;
  // Check for PostgREST error code
  if (error.code === 'PGRST116') return true;
  // Check for PostgreSQL error code (relation does not exist)
  if (error.code === '42P01') return true;
  // Check for HTTP 404 status
  if (error.status === 404) return true;
  // Check error message for table not found indicators
  if (error.message && (
    error.message.includes('does not exist') ||
    (error.message.includes('relation') && error.message.includes('not found')) ||
    error.message.includes('404')
  )) return true;
  return false;
};

const useCourseStore = create((set, get) => ({
  // State
  courses: [],
  enrolledCourses: [],
  currentCourse: null,
  currentLesson: null,
  courseProgress: {},
  quizAttempts: {},
  certificates: [],
  certificateTemplates: [],
  categories: [],
  courseModules: {}, // New: Store modules by course ID
  loading: {
    courses: false,
    enrollments: false,
    progress: false,
    quiz: false,
    quizzes: false,
    quizQuestions: false,
    categories: false,
    modules: false, // New: Loading state for modules
  },
  error: null,

  // Actions
  actions: {
    // Quiz Management: Fetch quizzes for a course
    fetchQuizzes: async (courseId) => {
      set((state) => ({ loading: { ...state.loading, quizzes: true }, error: null }));
      try {
        // Try with order_index first
        let { data, error } = await supabase
          .from(TABLES.QUIZZES)
          .select('*')
          .eq('course_id', courseId)
          .order('order_index', { ascending: true })
          .order('created_at', { ascending: false });
        
        // If order_index column doesn't exist, retry without it
        if (error && (error.message?.includes('order_index') || error.code === '42703')) {
          const fallbackQuery = await supabase
            .from(TABLES.QUIZZES)
            .select('*')
            .eq('course_id', courseId)
            .order('created_at', { ascending: false });
          data = fallbackQuery.data;
          error = fallbackQuery.error;
        }
        
        if (error) throw error;
        
        // Sort by order_index if it exists in the data
        const sortedData = data && data.length > 0 && data[0].order_index !== undefined
          ? [...(data || [])].sort((a, b) => {
              const orderA = a.order_index ?? 999;
              const orderB = b.order_index ?? 999;
              if (orderA !== orderB) return orderA - orderB;
              return new Date(b.created_at) - new Date(a.created_at);
            })
          : (data || []);
        
        set((state) => ({ loading: { ...state.loading, quizzes: false } }));
        return { data: sortedData, error: null };
      } catch (error) {
        set((state) => ({ loading: { ...state.loading, quizzes: false }, error: error.message }));
        return { data: [], error };
      }
    },

    // Quiz Management: Create quiz
    createQuiz: async (quizData, courseId, createdBy) => {
      try {
        // Determine user_id from auth if not provided
        let userId = createdBy;
        if (!userId) {
          const { data: authData } = await supabase.auth.getUser();
          userId = authData?.user?.id || null;
        }
        // Get next order_index if lesson_id is provided
        let orderIndex = quizData.order_index ?? null;
        if (!orderIndex && quizData.lesson_id) {
          try {
            let { data: existingQuizzes, error: orderError } = await supabase
              .from(TABLES.QUIZZES)
              .select('order_index')
              .eq('lesson_id', quizData.lesson_id)
              .order('order_index', { ascending: false })
              .limit(1);
            
            // If order_index column doesn't exist, try without it
            if (orderError && (orderError.message?.includes('order_index') || orderError.code === '42703')) {
              const fallback = await supabase
                .from(TABLES.QUIZZES)
                .select('*')
                .eq('lesson_id', quizData.lesson_id)
                .order('created_at', { ascending: false })
                .limit(1);
              existingQuizzes = fallback.data;
              orderError = fallback.error;
            }
            
            // If order_index column doesn't exist, skip it
            if (!orderError && existingQuizzes && existingQuizzes.length > 0) {
              orderIndex = (existingQuizzes[0].order_index || 0) + 1;
            } else if (!orderIndex) {
              orderIndex = 1;
            }
          } catch (e) {
            // order_index column might not exist, use default
            orderIndex = orderIndex ?? 1;
          }
        }

        // Build insert payload, conditionally include optional columns
        const insertPayload = {
          title: quizData.title,
          description: quizData.description ?? null,
          pass_threshold: quizData.pass_threshold ?? 70,
          time_limit_minutes: quizData.time_limit_minutes ?? null,
          lesson_id: quizData.lesson_id ?? null,
          course_id: courseId,
          user_id: userId, // matches schema
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        // Only include order_index if it's not null
        if (orderIndex !== null) {
          insertPayload.order_index = orderIndex;
        }
        
        // Only include quiz_type if provided (column may not exist in schema)
        if (quizData.quiz_type) {
          insertPayload.quiz_type = quizData.quiz_type;
        }
        
        const { data, error } = await supabase
          .from(TABLES.QUIZZES)
          .insert(insertPayload)
          .select()
          .single();
        
        // If quiz_type column doesn't exist, retry without it
        if (error && (error.message?.includes('quiz_type') || error.code === 'PGRST204')) {
          delete insertPayload.quiz_type;
          const { data: retryData, error: retryError } = await supabase
            .from(TABLES.QUIZZES)
            .insert(insertPayload)
            .select()
            .single();
          if (retryError) throw retryError;
          return { data: retryData, error: null };
        }
        
        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        return { data: null, error: error.message };
      }
    },

    // Quiz Management: Update quiz
    updateQuiz: async (quizId, updates) => {
      try {
        const updatePayload = { ...updates, updated_at: new Date().toISOString() };
        
        // Try update with all fields first
        let { data, error } = await supabase
          .from(TABLES.QUIZZES)
          .update(updatePayload)
          .eq('id', quizId)
          .select()
          .single();
        
        // If quiz_type or order_index column doesn't exist, remove them and retry
        if (error && (error.message?.includes('quiz_type') || error.message?.includes('order_index') || error.code === 'PGRST204')) {
          const { quiz_type, order_index, ...restUpdates } = updates;
          const fallbackPayload = { ...restUpdates, updated_at: new Date().toISOString() };
          
          const { data: retryData, error: retryError } = await supabase
            .from(TABLES.QUIZZES)
            .update(fallbackPayload)
            .eq('id', quizId)
            .select()
            .single();
          
          if (retryError) throw retryError;
          return { data: retryData, error: null };
        }
        
        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        return { data: null, error: error.message };
      }
    },

    // Quiz Management: Delete quiz
    deleteQuiz: async (quizId) => {
      try {
        const { error } = await supabase.from(TABLES.QUIZZES).delete().eq('id', quizId);
        if (error) throw error;
        return { success: true, error: null };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },

    // Quiz Questions: Fetch
    fetchQuizQuestions: async (quizId) => {
      set((state) => ({ loading: { ...state.loading, quizQuestions: true }, error: null }));
      try {
        const { data, error } = await supabase
          .from(TABLES.QUIZ_QUESTIONS)
          .select('*')
          .eq('quiz_id', quizId)
          .order('order_index', { ascending: true });
        if (error) throw error;
        set((state) => ({ loading: { ...state.loading, quizQuestions: false } }));
        return { data: data || [], error: null };
      } catch (error) {
        set((state) => ({ loading: { ...state.loading, quizQuestions: false }, error: error.message }));
        return { data: [], error };
      }
    },

    // Fetch single quiz by ID
    fetchQuiz: async (quizId) => {
      try {
        const { data, error } = await supabase
          .from(TABLES.QUIZZES)
          .select('*')
          .eq('id', quizId)
          .single();
        if (error) throw error;
        return { data: data || null, error: null };
      } catch (error) {
        return { data: null, error: error.message };
      }
    },

    // Quiz Questions: Upsert a list (create/update with order)
    upsertQuizQuestions: async (quizId, questions) => {
      try {
        if (!Array.isArray(questions)) return { data: [], error: 'Invalid questions array' };
        const mapToDbType = (t) => {
          if (t === 'single') return 'multiple_choice';
          if (t === 'multiple') return 'multiple_select';
          if (t === 'true_false') return 'true_false';
          if (t === 'short') return 'short_answer';
          return t || 'multiple_choice';
        };
        const payload = questions.map((q, idx) => ({
          quiz_id: quizId,
          question_type: mapToDbType(q.question_type),
          question_text: q.question_text,           // map app -> DB
          options: q.options || null,
          correct_answer: q.correct_answer,
          order_index: q.order_index ?? idx + 1,
          updated_at: new Date().toISOString(),
        }));
        // Replace-all strategy to avoid requiring a unique index
        const del = await supabase.from(TABLES.QUIZ_QUESTIONS).delete().eq('quiz_id', quizId);
        if (del.error) throw del.error;
        const { data, error } = await supabase
          .from(TABLES.QUIZ_QUESTIONS)
          .insert(payload)
          .select();
        if (error) throw error;
        return { data: data || [], error: null };
      } catch (error) {
        return { data: [], error: error.message };
      }
    },

    // Quiz Questions: Delete
    deleteQuizQuestion: async (questionId) => {
      try {
        const { error } = await supabase.from(TABLES.QUIZ_QUESTIONS).delete().eq('id', questionId);
        if (error) throw error;
        return { success: true, error: null };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },

    // Fetch quizzes linked to a lesson
    fetchQuizzesByLesson: async (lessonId) => {
      try {
        // Try with order_index first
        let { data, error } = await supabase
          .from(TABLES.QUIZZES)
          .select('*')
          .eq('lesson_id', lessonId)
          .order('order_index', { ascending: true })
          .order('created_at', { ascending: false });
        
        // If order_index column doesn't exist, retry without it
        if (error && (error.message?.includes('order_index') || error.code === '42703')) {
          const fallbackQuery = await supabase
            .from(TABLES.QUIZZES)
            .select('*')
            .eq('lesson_id', lessonId)
            .order('created_at', { ascending: false });
          data = fallbackQuery.data;
          error = fallbackQuery.error;
        }
        
        if (error) throw error;
        
        // Sort by order_index if it exists in the data
        const sortedData = data && data.length > 0 && data[0].order_index !== undefined
          ? [...(data || [])].sort((a, b) => {
              const orderA = a.order_index ?? 999;
              const orderB = b.order_index ?? 999;
              if (orderA !== orderB) return orderA - orderB;
              return new Date(b.created_at) - new Date(a.created_at);
            })
          : (data || []);
        
        return { data: sortedData, error: null };
      } catch (error) {
        return { data: [], error: error.message };
      }
    },
    // Fetch all courses
    fetchCourses: async (filters = {}, userId = null) => {
      set((state) => ({
        loading: { ...state.loading, courses: true },
        error: null,
      }));

      try {
        let query = supabase
          .from(TABLES.COURSES)
          .select(`
            *,
            category:${TABLES.COURSE_CATEGORIES}(id, name, color),
            creator:${TABLES.PROFILES}(id, first_name, last_name, email),
            enrollments:${TABLES.COURSE_ENROLLMENTS}(
              id, 
              user_id, 
              progress_percentage, 
              status, 
              enrolled_at, 
              completed_at,
              last_accessed
            )
          `)
          .order('created_at', { ascending: false });

        // Apply filters
        if (filters.category) {
          query = query.eq('category_id', filters.category);
        }
        if (filters.difficulty) {
          query = query.eq('difficulty_level', filters.difficulty);
        }
        if (filters.search) {
          query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
        }

        // Learner catalog: published + shown in catalog + org scope (individuals vs one customer org)
        if (filters.learnerCatalog) {
          query = query.eq('is_published', true).eq('catalog_visible', true);

          let viewerOrgId = filters.viewerOrganizationId;
          if (viewerOrgId === undefined && userId) {
            const { data: profileRow } = await supabase
              .from(TABLES.PROFILES)
              .select('organization_id')
              .eq('id', userId)
              .maybeSingle();
            viewerOrgId = profileRow?.organization_id ?? null;
          }

          if (viewerOrgId) {
            query = query.or(`restricted_organization_id.is.null,restricted_organization_id.eq.${viewerOrgId}`);
          } else {
            query = query.is('restricted_organization_id', null);
          }
        }

        const { data, error } = await query;
        if (error) throw error;

        // Transform data to include user enrollment status and progress
        let transformedCourses = data || [];
        if (userId && data) {
          transformedCourses = data.map(course => {
            const userEnrollment = course.enrollments?.find(enrollment => enrollment.user_id === userId);
            return {
              ...course,
              isEnrolled: !!userEnrollment,
              enrollment_id: userEnrollment?.id,
              progress_percentage: userEnrollment?.progress_percentage || 0,
              enrollment_status: userEnrollment?.status || null,
              enrolled_at: userEnrollment?.enrolled_at,
              completed_at: userEnrollment?.completed_at,
              last_accessed: userEnrollment?.last_accessed,
              canContinue: userEnrollment && userEnrollment.progress_percentage < 100
            };
          });
        }

        set((state) => ({
          courses: transformedCourses,
          loading: { ...state.loading, courses: false },
        }));

        return { data: transformedCourses, error: null };
      } catch (error) {
        set((state) => ({
          error: error.message,
          loading: { ...state.loading, courses: false },
        }));
        return { data: null, error };
      }
    },

    // Fetch user's enrolled courses
    fetchEnrolledCourses: async (userId) => {
      set((state) => ({
        loading: { ...state.loading, enrollments: true },
        error: null,
      }));

      try {
        const { data: enrolledCoursesData, error } = await supabase
          .from(TABLES.COURSE_ENROLLMENTS)
          .select(`
            id,
            enrolled_at,
            completed_at,
            progress_percentage,
            status,
            last_accessed,
            course:${TABLES.COURSES} (
              id,
              title,
              description,
              thumbnail_url,
              duration_minutes,
              difficulty_level,
              category_id,
              is_published,
              created_at,
              resources
            )
          `)
          .eq('user_id', userId)
          .order('enrolled_at', { ascending: false });

        if (error) throw error;

        if (!enrolledCoursesData || enrolledCoursesData.length === 0) {
          set((state) => ({
            enrolledCourses: [],
            loading: { ...state.loading, enrollments: false },
          }));
          return { data: [], error: null };
        }

        // Transform the data to match expected format
        const enrolledCourses = enrolledCoursesData
          .filter(enrollment => enrollment.course)
          .map(enrollment => ({
            ...enrollment.course,
            enrollment_id: enrollment.id,
            enrolled_at: enrollment.enrolled_at,
            completed_at: enrollment.completed_at,
            progress_percentage: enrollment.progress_percentage || 0,
            status: enrollment.status || 'active',
            last_accessed: enrollment.last_accessed,
          }));

        set((state) => ({
          enrolledCourses,
          loading: { ...state.loading, enrollments: false },
        }));

        return { data: enrolledCourses, error: null };
      } catch (error) {
        set((state) => ({
          error: error.message,
          enrolledCourses: [],
          loading: { ...state.loading, enrollments: false },
        }));
        return { data: [], error };
      }
    },

    // Enroll in a course
    enrollInCourse: async (userId, courseId) => {
      if (!userId || !courseId || typeof courseId !== 'string' || courseId.trim() === '') {
        return { data: null, error: 'Invalid user or course identifier' };
      }
      try {
        // Verify the user has access to this course based on their subscription
        const [profileResult, courseResult] = await Promise.all([
          supabase.from(TABLES.PROFILES).select('subscription_plan, organization_id').eq('id', userId).maybeSingle(),
          supabase.from(TABLES.COURSES).select('is_free_trial, restricted_organization_id').eq('id', courseId).maybeSingle(),
        ]);

        const userPlan = profileResult.data?.subscription_plan || 'free_trial';
        const userOrgId = profileResult.data?.organization_id;
        const courseIsFreeTrial = courseResult.data?.is_free_trial;
        const courseOrgId = courseResult.data?.restricted_organization_id;

        // Corporate users always get free access to their own org's courses
        const isCorporateCourseAccess = userOrgId && courseOrgId && userOrgId === courseOrgId;

        if (!isCorporateCourseAccess && userPlan === 'free_trial' && !courseIsFreeTrial) {
          return { data: null, error: 'A paid subscription is required to access this course. Please upgrade your plan.' };
        }

        // Check if already enrolled
        const { data: existingEnrollment, error: existingError } = await supabase
          .from(TABLES.COURSE_ENROLLMENTS)
          .select('id, status, progress_percentage, last_accessed')
          .eq('course_id', courseId)
          .eq('user_id', userId)
          .eq('status', 'active')
          .maybeSingle();

        if (existingError && existingError.code !== 'PGRST116') {
          throw existingError;
        }

        if (existingEnrollment) {
          return { data: existingEnrollment, error: null };
        }

        // Create new enrollment
        const { data, error } = await supabase
          .from(TABLES.COURSE_ENROLLMENTS)
          .insert({
            course_id: courseId,
            user_id: userId,
            enrolled_at: new Date().toISOString(),
            status: 'active',
            progress_percentage: 0,
            last_accessed: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;

        // Optimistically update local state
        set((state) => {
          const updatedCourses = state.courses.map((course) =>
            course.id === courseId
              ? { ...course, isEnrolled: true, canContinue: true }
              : course
          );

          return {
            courses: updatedCourses,
            enrolledCourses: [
              ...state.enrolledCourses,
              data,
            ],
          };
        });

        return { data, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },

    // Update lesson progress
    updateLessonProgress: async (userId, lessonId, courseId, completed = true, metadata = {}) => {
      try {
        // Validate UUIDs before proceeding
        if (!userId || !lessonId || !courseId || userId === 'undefined' || lessonId === 'undefined' || courseId === 'undefined') {
          return { 
            data: null, 
            error: { message: 'Missing required IDs: userId, lessonId, or courseId is undefined' },
            canComplete: false,
            reviewCompleted: false,
            timeSpentSeconds: 0,
            minimumTimeRequired: null
          };
        }
        
        // Check if time tracking columns exist by trying to query them
        // If columns don't exist (PGRST204 error), skip time tracking entirely
        let existingProgress = null;
        let hasTimeTrackingColumns = false;
        
        // Try to query with time tracking columns - always include metadata to preserve notes
        const { data: timeTrackingData, error: timeTrackingError } = await supabase
          .from(TABLES.LESSON_PROGRESS)
          .select('time_spent_seconds, minimum_time_required, review_completed, metadata')
          .eq('user_id', userId)
          .eq('lesson_id', lessonId)
          .eq('course_id', courseId)
          .maybeSingle();
        
        // Check if error is due to missing columns (PGRST204 = column not found)
        const isColumnMissingError = timeTrackingError && (
          timeTrackingError.code === 'PGRST204' || 
          timeTrackingError.code === '42703' ||
          timeTrackingError.message?.includes('column') || 
          timeTrackingError.message?.includes('does not exist') ||
          timeTrackingError.message?.includes('Could not find') ||
          (timeTrackingError.hint && timeTrackingError.hint.includes('column'))
        );
        
        if (isColumnMissingError) {
          // Columns don't exist yet - skip time tracking
          hasTimeTrackingColumns = false;
          // Get basic progress without time tracking columns
          const { data: basicData } = await supabase
            .from(TABLES.LESSON_PROGRESS)
            .select('*')
            .eq('user_id', userId)
            .eq('lesson_id', lessonId)
            .eq('course_id', courseId)
            .maybeSingle();
          existingProgress = basicData;
        } else if (!timeTrackingError && timeTrackingData) {
          // Columns exist and we got data
          hasTimeTrackingColumns = true;
          existingProgress = timeTrackingData;
        } else {
          // Other error or no data - try basic query
          const { data: basicData } = await supabase
            .from(TABLES.LESSON_PROGRESS)
            .select('*')
            .eq('user_id', userId)
            .eq('lesson_id', lessonId)
            .eq('course_id', courseId)
            .maybeSingle();
          existingProgress = basicData;
          hasTimeTrackingColumns = false;
        }
        
        // Only calculate time tracking if columns exist
        let totalTimeSpentSeconds = 0;
        let minimumTimeRequired = null;
        let reviewCompleted = true;
        let canComplete = true;
        
        if (hasTimeTrackingColumns) {
          const existingTimeSpent = existingProgress?.time_spent_seconds || 0;
          
          // Calculate additional time spent in this session
          const additionalTimeSpent = metadata.timeSpent ? Math.floor(metadata.timeSpent) : 0;
          
          // Accumulate total time spent (existing + additional)
          totalTimeSpentSeconds = existingTimeSpent + additionalTimeSpent;
          
          // Get lesson to check for minimum time requirement
          const { data: lessonData } = await supabase
            .from(TABLES.LESSONS)
            .select('duration_minutes')
            .eq('id', lessonId)
            .single();
          
          // Calculate minimum time required (80% of lesson duration, or minimum 30 seconds)
          minimumTimeRequired = lessonData?.duration_minutes 
            ? Math.max(30, Math.floor(lessonData.duration_minutes * 60 * 0.8))
            : null;
          
          // Check if review is completed (total time spent >= minimum required)
          reviewCompleted = minimumTimeRequired 
            ? totalTimeSpentSeconds >= minimumTimeRequired 
            : true; // If no minimum time, consider reviewed
          
          // Always allow completion when explicitly requested (bypass time requirements)
          // This allows users to complete lessons regardless of time spent
          canComplete = completed;
        } else {
          // No time tracking - allow completion normally
          canComplete = completed;
        }
        
        // Get existing metadata to preserve notes and other fields
        let existingMetadata = existingProgress?.metadata || {}
        if (typeof existingMetadata === 'string') {
          try {
            existingMetadata = JSON.parse(existingMetadata)
          } catch {
            existingMetadata = {}
          }
        }
        if (typeof existingMetadata !== 'object' || existingMetadata === null) {
          existingMetadata = {}
        }
        
        // Merge new metadata with existing to preserve notes
        // Important: preserve notes from existingMetadata - they should never be overwritten by time tracking updates
        const notesToPreserve = existingMetadata?.notes;
        const mergedMetadata = {
          ...existingMetadata,
          ...metadata,
          // Always preserve notes if they exist in existing metadata (unless explicitly being updated)
          ...(notesToPreserve ? { notes: notesToPreserve } : {})
        };
        
        // Build upsert payload - only include time tracking columns if they exist
        const upsertPayload = {
          user_id: userId,
          lesson_id: lessonId,
          course_id: courseId,
          completed: canComplete ? completed : false,
          completed_at: (canComplete && completed) ? new Date().toISOString() : null,
          metadata: mergedMetadata,
        };
        
        // Only add time tracking fields if columns exist
        if (hasTimeTrackingColumns) {
          upsertPayload.time_spent_seconds = totalTimeSpentSeconds;
          upsertPayload.minimum_time_required = minimumTimeRequired;
          upsertPayload.review_completed = reviewCompleted;
          upsertPayload.last_activity_at = new Date().toISOString();
        }
        
        const { data, error } = await supabase
          .from(TABLES.LESSON_PROGRESS)
          .upsert(upsertPayload, { onConflict: 'user_id,lesson_id,course_id' })
          .select()
          .single();

        if (error) {
          // If error is due to missing columns, try again without time tracking fields
          const isColumnMissingError = error && (
            error.code === 'PGRST204' || 
            error.code === '42703' ||
            error.message?.includes('column') || 
            error.message?.includes('does not exist') ||
            error.message?.includes('Could not find') ||
            (error.hint && error.hint.includes('column'))
          );
          
          if (isColumnMissingError && hasTimeTrackingColumns) {
            // Retry without time tracking columns - use merged metadata to preserve notes
            const basicPayload = {
              user_id: userId,
              lesson_id: lessonId,
              course_id: courseId,
              completed: canComplete ? completed : false,
              completed_at: (canComplete && completed) ? new Date().toISOString() : null,
              metadata: mergedMetadata,
            };
            
            const { data: retryData, error: retryError } = await supabase
              .from(TABLES.LESSON_PROGRESS)
              .upsert(basicPayload, { onConflict: 'user_id,lesson_id,course_id' })
              .select()
              .single();
            
            if (retryError) {
              return { data: null, error: retryError };
            }
            
            // Update local state with basic data - include merged metadata
            set((state) => ({
              courseProgress: {
                ...state.courseProgress,
                [courseId]: {
                  ...state.courseProgress[courseId],
                  [lessonId]: {
                    completed: canComplete ? completed : false,
                    completed_at: retryData.completed_at,
                    metadata: mergedMetadata,
                  },
                },
              },
            }));
            
            return {
              data: retryData,
              error: null,
              canComplete,
              reviewCompleted: true,
              timeSpentSeconds: 0,
              minimumTimeRequired: null
            };
          }
          return { data: null, error };
        }

        // Update local progress state - use merged metadata to preserve notes
        const progressUpdate = {
          completed: canComplete ? completed : false, 
          completed_at: data.completed_at,
          metadata: mergedMetadata,
        };
        
        // Only add time tracking fields if columns exist
        if (hasTimeTrackingColumns) {
          progressUpdate.time_spent_seconds = totalTimeSpentSeconds;
          progressUpdate.minimum_time_required = minimumTimeRequired;
          progressUpdate.review_completed = reviewCompleted;
        }
        
        set((state) => ({
          courseProgress: {
            ...state.courseProgress,
            [courseId]: {
              ...state.courseProgress[courseId],
              [lessonId]: progressUpdate,
            },
          },
        }));

        // Calculate and update overall course progress
        await get().actions.calculateCourseProgress(userId, courseId);

        return { 
          data, 
          error: null,
          canComplete,
          reviewCompleted: hasTimeTrackingColumns ? reviewCompleted : true,
          timeSpentSeconds: hasTimeTrackingColumns ? totalTimeSpentSeconds : 0,
          minimumTimeRequired: hasTimeTrackingColumns ? minimumTimeRequired : null
        };
      } catch (error) {
        return { data: null, error };
      }
    },

    // Calculate course progress percentage
    calculateCourseProgress: async (userId, courseId) => {
      try {
        // Validate parameters
        if (!userId || !courseId || userId === 'undefined' || courseId === 'undefined') {
          return 0;
        }

        // Get total lessons in course
        const { data: lessons, error: lessonsError } = await supabase
          .from(TABLES.LESSONS)
          .select('id')
          .eq('course_id', courseId);

        if (lessonsError) {
          return 0;
        }

        // Get completed lessons
        const { data: completedProgress, error: progressError } = await supabase
          .from(TABLES.LESSON_PROGRESS)
          .select('lesson_id')
          .eq('user_id', userId)
          .eq('course_id', courseId)
          .eq('completed', true);

        if (progressError) {
          return 0;
        }

        const totalLessons = lessons?.length || 0;
        const completedLessons = completedProgress?.length || 0;
        const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

        // Update enrollment record
        const { error: updateError } = await supabase
          .from(TABLES.COURSE_ENROLLMENTS)
          .update({
            progress_percentage: progressPercentage,
            completed_at: progressPercentage === 100 ? new Date().toISOString() : null,
            last_accessed: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('course_id', courseId);

        if (updateError) {
          // Don't throw, just return the calculated percentage
        }

        // If course is completed (100%), ensure certificate exists
        if (progressPercentage === 100) {
          const { data: existingCert } = await get().actions.getCertificateForCourse(userId, courseId);
          if (!existingCert) {
            // Get default certificate template and generate certificate
            const { data: templates } = await get().actions.fetchCertificateTemplates();
            const defaultTemplate = templates?.find(t => t.is_default) || templates?.[0];

            if (defaultTemplate) {
              await get().actions.generateCertificateFromTemplate(userId, courseId, defaultTemplate.id);
            } else {
              // Fallback to basic certificate creation if no template exists
              await get().actions.createCertificate(userId, courseId);
            }
          }
        }

        // Update local state
        set((state) => ({
          enrolledCourses: state.enrolledCourses.map(course =>
            course.id === courseId
              ? { ...course, progress_percentage: progressPercentage }
              : course
          ),
        }));

        return progressPercentage;
      } catch {
        return 0;
      }
    },

    // Fetch course progress for a user
    fetchCourseProgress: async (userId, courseId) => {
      set((state) => ({
        loading: { ...state.loading, progress: true },
        error: null,
      }));

      try {
        // Validate parameters
        if (!userId || !courseId || userId === 'undefined' || courseId === 'undefined') {
          return { data: {}, error: null };
        }

        const { data, error } = await supabase
          .from(TABLES.LESSON_PROGRESS)
          .select('*')
          .eq('user_id', userId)
          .eq('course_id', courseId);

        if (error) {
          // Return empty progress instead of throwing
          return { data: {}, error: null };
        }

        const progressMap = {};
        data?.forEach(progress => {
          progressMap[progress.lesson_id] = {
            completed: progress.completed,
            completed_at: progress.completed_at,
            time_spent_seconds: progress.time_spent_seconds ?? 0,
            minimum_time_required: progress.minimum_time_required ?? null,
            review_completed: progress.review_completed ?? false,
            metadata: progress.metadata,
          };
        });

        set((state) => ({
          courseProgress: {
            ...state.courseProgress,
            [courseId]: progressMap,
          },
          loading: { ...state.loading, progress: false },
        }));

        return { data: progressMap, error: null };
      } catch (error) {
        set((state) => ({
          error: error.message,
          loading: { ...state.loading, progress: false },
        }));
        // Return empty progress instead of null
        return { data: {}, error: null };
      }
    },

    // Submit quiz attempt
    submitQuizAttempt: async (userId, quizId, answers, score, maxScore = null) => {
      set((state) => ({
        loading: { ...state.loading, quiz: true },
        error: null,
      }));

      try {
        // Get quiz details to determine pass threshold
        const { data: quizData, error: quizError } = await supabase
          .from(TABLES.QUIZZES)
          .select('pass_threshold, lesson_id, course_id')
          .eq('id', quizId)
          .single();

        if (quizError) throw quizError;

        // Calculate if quiz was passed
        const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
        const passThreshold = quizData.pass_threshold || 70;
        const passed = percentage >= passThreshold;
        

        // Insert quiz attempt with completion status
        const { data, error } = await supabase
          .from(TABLES.QUIZ_ATTEMPTS)
          .insert({
            user_id: userId,
            quiz_id: quizId,
            answers,
            score,
            max_score: maxScore,
            percentage: percentage,
            passed: passed,
            completed_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;

        // If quiz was passed, mark lesson as completed
        if (passed && quizData.lesson_id && quizData.course_id) {
          await get().actions.updateLessonProgress(
            userId, 
            quizData.lesson_id, 
            quizData.course_id, 
            true, 
            { 
              completed_via: 'quiz',
              quiz_id: quizId,
              quiz_score: score,
              quiz_percentage: percentage,
              completed_at: new Date().toISOString()
            }
          );
        }

        // Update local quiz attempts
        set((state) => ({
          quizAttempts: {
            ...state.quizAttempts,
            [quizId]: [...(state.quizAttempts[quizId] || []), data],
          },
          loading: { ...state.loading, quiz: false },
        }));

        return { data: { ...data, passed, percentage }, error: null };
      } catch (error) {
        set((state) => ({
          error: error.message,
          loading: { ...state.loading, quiz: false },
        }));
        return { data: null, error };
      }
    },

    // Fetch quiz attempts for a user and quiz
    fetchQuizAttempts: async (userId, quizId) => {
      try {
        const { data, error } = await supabase
          .from(TABLES.QUIZ_ATTEMPTS)
          .select('*')
          .eq('user_id', userId)
          .eq('quiz_id', quizId)
          .order('completed_at', { ascending: false });

        if (error) throw error;
        return { data: data || [], error: null };
      } catch (error) {
        return { data: [], error };
      }
    },

    // Fetch user certificates
    fetchCertificates: async (userId) => {
      try {
        const { data, error } = await supabase
          .from(TABLES.CERTIFICATES)
          .select(`
            *,
            course:${TABLES.COURSES}(id, title, description)
          `)
          .eq('user_id', userId)
          .order('issued_at', { ascending: false });

        if (error) throw error;

        set({ certificates: data || [] });
        return { data: data || [], error: null };
      } catch (error) {
        set({ certificates: [] });
        return { data: [], error };
      }
    },

    // Get a certificate for a user and course (if any)
    getCertificateForCourse: async (userId, courseId) => {
      try {
        const { data, error } = await supabase
          .from(TABLES.CERTIFICATES)
          .select('*')
          .eq('user_id', userId)
          .eq('course_id', courseId)
          .limit(1);

        if (error) throw error;
        const certificate = Array.isArray(data) && data.length > 0 ? data[0] : null;
        return { data: certificate, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },

    /**
     * Ensures a public share token exists for the certificate (owner only). Uses RPC `mint_certificate_share_token`.
     * @param {string} certificateId
     * @returns {Promise<{ data: string | null, error: Error | null }>}
     */
    mintCertificateShareToken: async (certificateId) => {
      try {
        const { data, error } = await supabase.rpc('mint_certificate_share_token', {
          p_certificate_id: certificateId,
        });
        if (error) {
          throw error;
        }
        const token = typeof data === 'string' ? data : data != null ? String(data) : null;
        return { data: token && token.length > 0 ? token : null, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },

    // Create a certificate record upon completion
    createCertificate: async (userId, courseId) => {
      try {
        // Get user and course data to populate certificate_data
        const [userProfile, courseData] = await Promise.all([
          getUserProfile(userId),
          supabase.from(TABLES.COURSES).select('*').eq('id', courseId).single()
        ]);

        const certificateData = {
          user_name: userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : 'Student',
          course_title: courseData?.data?.title || 'Course',
          completion_date: new Date().toLocaleDateString(),
          issue_date: new Date().toLocaleDateString(),
          certificate_id: `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          instructor_name: courseData?.data?.instructor || 'Leadwise Academy',
          organization_name: userProfile?.organization?.name || 'Leadwise Academy'
        };

        const { data, error } = await supabase
          .from(TABLES.CERTIFICATES)
          .insert({
            user_id: userId,
            course_id: courseId,
            issued_at: new Date().toISOString(),
            certificate_data: certificateData
          })
          .select()
          .single();

        if (error) throw error;

        // Refresh local certificates cache (best effort)
        const { data: updated } = await get().actions.fetchCertificates(userId);
        set({ certificates: updated || [] });

        return { data, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },

    // Certificate Templates Management
    fetchCertificateTemplates: async () => {
      try {
        const { data, error } = await safeQuery(
          supabase
            .from(TABLES.CERTIFICATE_TEMPLATES)
            .select('*')
            .order('created_at', { ascending: false }),
          'fetchCertificateTemplates',
          30000
        );

        if (error) throw error;

        const templates = data || [];
        set({ certificateTemplates: templates });
        return { data: templates, error: null };
      } catch (error) {
        set({ certificateTemplates: [] });
        return { data: [], error };
      }
    },

    createCertificateTemplate: async (templateData) => {
      try {
        const { data: insertedRows, error } = await supabase
          .from(TABLES.CERTIFICATE_TEMPLATES)
          .insert({
            name: templateData.name,
            description: templateData.description,
            template_url: templateData.template_url,
            placeholders: templateData.placeholders || {},
            is_default: templateData.is_default || false,
            created_by: templateData.created_by,
            created_at: new Date().toISOString(),
            theme: templateData.theme || 'gallery',
            logo_url: templateData.logo_url || null,
            logo_position: templateData.logo_position || 'top-left',
            theme_colors: templateData.theme_colors ?? null,
          })
          .select();

        if (error) throw error;

        const data = Array.isArray(insertedRows) ? insertedRows[0] : insertedRows;
        if (!data) {
          throw new Error(
            'Template was not returned after create. Check Row Level Security on certificate_templates and run the latest migrations (theme, logo_url, theme_colors columns).'
          );
        }

        // Refresh templates
        const { data: updated } = await get().actions.fetchCertificateTemplates();
        set({ certificateTemplates: updated || [] });

        return { data, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },

    updateCertificateTemplate: async (templateId, updates) => {
      try {
        let filtered = buildCertificateTemplateUpdatePayload(updates, true);
        let { data: updatedRows, error } = await supabase
          .from(TABLES.CERTIFICATE_TEMPLATES)
          .update(filtered)
          .eq('id', templateId)
          .select();

        if (error && isMissingSchemaColumnError(error)) {
          filtered = buildCertificateTemplateUpdatePayload(updates, false);
          ({ data: updatedRows, error } = await supabase
            .from(TABLES.CERTIFICATE_TEMPLATES)
            .update(filtered)
            .eq('id', templateId)
            .select());
        }

        if (error) throw error;

        const data = Array.isArray(updatedRows) ? updatedRows[0] : updatedRows;
        if (!data) {
          return {
            data: null,
            error: new Error(
              'No row was updated. The template may not exist, or Row Level Security blocked the update. Apply migrations 20260401 (columns) and 20260402 (RLS). You must be the template creator, have a platform admin/instructor profile role, or an active org role (owner/admin/instructor) per 20260402.'
            ),
          };
        }

        // Refresh templates
        const { data: updated } = await get().actions.fetchCertificateTemplates();
        set({ certificateTemplates: updated || [] });

        return { data, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },

    deleteCertificateTemplate: async (templateId) => {
      try {
        const { error } = await supabase
          .from(TABLES.CERTIFICATE_TEMPLATES)
          .delete()
          .eq('id', templateId);

        if (error) throw error;

        // Refresh templates
        const { data: updated } = await get().actions.fetchCertificateTemplates();
        set({ certificateTemplates: updated || [] });

        return { error: null };
      } catch (error) {
        return { error };
      }
    },

    // Generate certificate from template
    generateCertificateFromTemplate: async (userId, courseId, templateId) => {
      try {
        // Get user and course data
        const [userProfile, courseData, templateData] = await Promise.all([
          getUserProfile(userId),
          supabase.from(TABLES.COURSES).select('*').eq('id', courseId).single(),
          supabase.from(TABLES.CERTIFICATE_TEMPLATES).select('*').eq('id', templateId).maybeSingle()
        ]);

        if (templateData.error) throw templateData.error;

        if (userProfile && courseData.data && templateData.data) {
          const certificateData = {
            user_id: userId,
            course_id: courseId,
            template_id: templateId,
            issued_at: new Date().toISOString(),
            certificate_data: {
              user_name: `${userProfile.first_name} ${userProfile.last_name}`,
              course_title: courseData.data.title,
              completion_date: new Date().toLocaleDateString(),
              instructor_name: courseData.data.instructor || 'Leadwise Academy',
              issue_date: new Date().toLocaleDateString(),
              certificate_id: `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
              organization_name: userProfile.organization?.name || 'Leadwise Academy',
            }
          };

          const { data, error } = await supabase
            .from(TABLES.CERTIFICATES)
            .insert(certificateData)
            .select()
            .single();

          if (error) throw error;

          // Refresh certificates
          const { data: updated } = await get().actions.fetchCertificates(userId);
          set({ certificates: updated || [] });

          return { data, error: null };
        } else {
          throw new Error('Missing required data for certificate generation');
        }
      } catch (error) {
        return { data: null, error };
      }
    },

    // Generate certificate preview/download with filled placeholders
    generateCertificatePreview: async (certificateId, theme = 'gallery') => {
      const {
        renderCertificateCanvas,
        createCertificateFilename,
        getCertificateCanvasDimensions,
      } = await import('@/utils/certificateUtils');

      let certificate;

      if (certificateId === 'preview') {
        certificate = {
          id: 'preview',
          certificate_data: {
            user_name: 'John Doe',
            course_title: 'Sample Course',
            completion_date: new Date().toLocaleDateString(),
            issue_date: new Date().toLocaleDateString(),
            certificate_id: 'CERT-PREVIEW-123',
            instructor_name: 'Jane Smith',
            organization_name: 'Leadwise Academy',
          },
          template: {
            logo_url: null,
            logo_position: 'top-left',
            theme: 'gallery',
          },
        };
      } else {
        const { data: certData, error } = await supabase
          .from(TABLES.CERTIFICATES)
          .select(`
              *,
              template:${TABLES.CERTIFICATE_TEMPLATES}(*),
              course:${TABLES.COURSES}(*)
            `)
          .eq('id', certificateId)
          .single();

        if (error) throw error;
        certificate = certData;

        if (!certificate.template) {
          certificate.template = {
            logo_url: null,
            logo_position: 'top-left',
            theme: 'gallery',
          };
        }
      }

      const resolvedTheme = certificate.template?.theme || theme || 'gallery';
      const { width: cw, height: ch } = getCertificateCanvasDimensions(resolvedTheme);

      const canvas = document.createElement('canvas');
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext('2d');

      await renderCertificateCanvas(
        ctx,
        canvas.width,
        canvas.height,
        resolvedTheme,
        certificate.certificate_data,
        {
          logo_url: certificate.template?.logo_url,
          logo_position: certificate.template?.logo_position || 'top-left',
          theme_colors:
            certificate.template?.theme_colors &&
            typeof certificate.template.theme_colors === 'object'
              ? certificate.template.theme_colors
              : undefined,
        }
      );

      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            const filename = createCertificateFilename(
              certificate.certificate_data?.course_title,
              certificate.certificate_data?.user_name
            );
            resolve({
              blob,
              url: URL.createObjectURL(blob),
              filename,
            });
          } else {
            reject(new Error('Failed to generate certificate image'));
          }
        }, 'image/png');
      });
    },

    // Set current course
    setCurrentCourse: (course) => {
      set({ currentCourse: course });
    },

    // Set current lesson
    setCurrentLesson: (lesson) => {
      set({ currentLesson: lesson });
    },

    // Clear course data
    clearCourseData: () => {
      set({
        courses: [],
        enrolledCourses: [],
        currentCourse: null,
        currentLesson: null,
        courseProgress: {},
        quizAttempts: {},
        certificates: [],
        error: null,
      });
    },

    // Corporate: Assign course to employees
    assignCourseToEmployees: async (courseId, employeeIds, assignedBy) => {
      try {
        const assignments = employeeIds.map(employeeId => ({
          course_id: courseId,
          user_id: employeeId,
          assigned_by: assignedBy,
          enrolled_at: new Date().toISOString(),
          status: 'assigned',
          progress_percentage: 0,
        }));

        const { data, error } = await supabase
          .from(TABLES.COURSE_ENROLLMENTS)
          .upsert(assignments, { onConflict: 'course_id,user_id' })
          .select();

        if (error) throw error;

        return { data, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },

    // Corporate: Get team progress
    fetchTeamProgress: async (organizationId) => {
      try {
        const { data, error } = await supabase
          .from(TABLES.COURSE_ENROLLMENTS)
          .select(`
            *,
            user:profiles(id, full_name, email),
            course:${TABLES.COURSES}(
              id,
              title,
              category_id,
              category:${TABLES.COURSE_CATEGORIES}(id, name)
            )
          `)
          .eq('organization_id', organizationId)
          .order('enrolled_at', { ascending: false });

        if (error) throw error;

        return { data, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },

    // Course Management: Create new course
    createCourse: async (courseData, createdBy) => {
      try {
        // Enforce unique course title (case-insensitive)
        if (courseData?.title) {
          const { data: existing } = await supabase
            .from(TABLES.COURSES)
            .select('id')
            .ilike('title', courseData.title)
            .limit(1);
          if (existing && existing.length > 0) {
            return { data: null, error: 'A course with this title already exists' };
          }
        }

        // Auto-scope corporate courses: if the creator belongs to an org
        // and no explicit restriction was set, restrict to their org.
        // Corporate courses are always free for their employees.
        // Only system_admin courses are visible platform-wide (paid or free trial).
        let orgRestriction = courseData.restricted_organization_id || null;
        let coursePrice = courseData.price;
        if (!orgRestriction && createdBy) {
          const { data: creatorProfile } = await supabase
            .from(TABLES.PROFILES)
            .select('organization_id, role')
            .eq('id', createdBy)
            .maybeSingle();
          if (creatorProfile?.organization_id && creatorProfile.role !== 'system_admin') {
            orgRestriction = creatorProfile.organization_id;
            coursePrice = 0;
          }
        }

        const { data, error } = await supabase
          .from(TABLES.COURSES)
          .insert({
            ...courseData,
            price: coursePrice ?? 0,
            restricted_organization_id: orgRestriction,
            created_by: createdBy,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_published: false,
            status: 'draft'
          })
          .select()
          .single();

        if (error) throw error;

        // Don't refresh here to prevent infinite loops
        // The store will update automatically

        return { data, error: null };
      } catch (error) {
        return { data: null, error: error.message };
      }
    },

    // Course Management: Update course
    updateCourse: async (courseId, updates) => {
      try {
        // Enforce unique course title on update (case-insensitive)
        if (updates?.title) {
          const { data: existing } = await supabase
            .from(TABLES.COURSES)
            .select('id')
            .ilike('title', updates.title)
            .neq('id', courseId)
            .limit(1);
          if (existing && existing.length > 0) {
            return { data: null, error: 'A course with this title already exists' };
          }
        }

        const { data, error } = await supabase
          .from(TABLES.COURSES)
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', courseId)
          .select()
          .single();

        if (error) throw error;

        // Don't refresh here to prevent infinite loops
        // The store will update automatically

        return { data, error: null };
      } catch (error) {
        return { data: null, error: error.message };
      }
    },

    // Course Management: Delete course
    deleteCourse: async (courseId) => {
      try {
        // First, get all related lesson IDs for this course
        const { data: courseLessons } = await supabase
          .from(TABLES.LESSONS)
          .select('id')
          .eq('course_id', courseId);

        const lessonIds = courseLessons?.map(l => l.id) || [];

        // Delete lesson progress for all lessons in this course
        if (lessonIds.length > 0) {
          const { error: progressError } = await supabase
            .from(TABLES.LESSON_PROGRESS)
            .delete()
            .in('lesson_id', lessonIds);
          
          if (progressError) {
            throw new Error(`Failed to delete lesson progress: ${progressError.message}`);
          }
        }

        // Get all quiz IDs for this course
        const { data: courseQuizzes } = await supabase
          .from(TABLES.QUIZZES)
          .select('id')
          .eq('course_id', courseId);

        const quizIds = courseQuizzes?.map(q => q.id) || [];

        // Delete quiz attempts
        if (quizIds.length > 0) {
          const { error: attemptsError } = await supabase
            .from('quiz_attempts')
            .delete()
            .in('quiz_id', quizIds);
          
          if (attemptsError) {
            throw new Error(`Failed to delete quiz attempts: ${attemptsError.message}`);
          }
        }

        // Delete quiz questions
        if (quizIds.length > 0) {
          const { error: questionsError } = await supabase
            .from(TABLES.QUIZ_QUESTIONS)
            .delete()
            .in('quiz_id', quizIds);
          
          if (questionsError) {
            throw new Error(`Failed to delete quiz questions: ${questionsError.message}`);
          }
        }

        // Delete quizzes
        const { error: quizzesError } = await supabase
          .from(TABLES.QUIZZES)
          .delete()
          .eq('course_id', courseId);

        if (quizzesError) {
          throw new Error(`Failed to delete quizzes: ${quizzesError.message}`);
        }

        // Delete presentation-related data
        if (lessonIds.length > 0) {
          // Get presentation IDs
          const { data: presentations } = await supabase
            .from('lesson_presentations')
            .select('id')
            .in('lesson_id', lessonIds);

          const presentationIds = presentations?.map(p => p.id) || [];

          if (presentationIds.length > 0) {
            // Delete slide progress (ignore if table doesn't exist)
            const { error: slideProgressError } = await supabase
              .from('slide_progress')
              .delete()
              .in('presentation_id', presentationIds);
            
            // Ignore table not found errors
            if (slideProgressError && !isTableNotFoundError(slideProgressError)) {
              // Log unexpected errors but don't fail the operation
            }

            // Delete presentation progress (ignore if table doesn't exist)
            const { error: presentationProgressError } = await supabase
              .from('presentation_progress')
              .delete()
              .in('presentation_id', presentationIds);
            
            // Ignore table not found errors
            if (presentationProgressError && !isTableNotFoundError(presentationProgressError)) {
              // Log unexpected errors but don't fail the operation
            }

            // Delete slides
            await supabase
              .from('presentation_slides')
              .delete()
              .in('presentation_id', presentationIds);

            // Delete presentations
            await supabase
              .from('lesson_presentations')
              .delete()
              .in('lesson_id', lessonIds);
          }
        }

        // Delete lessons
        const { error: lessonsError } = await supabase
          .from(TABLES.LESSONS)
          .delete()
          .eq('course_id', courseId);

        if (lessonsError) {
          throw new Error(`Failed to delete lessons: ${lessonsError.message}`);
        }

        // Delete modules
        const { error: modulesError } = await supabase
          .from(TABLES.COURSE_MODULES)
          .delete()
          .eq('course_id', courseId);

        if (modulesError) {
          throw new Error(`Failed to delete modules: ${modulesError.message}`);
        }

        // Delete course enrollments
        const { error: enrollmentsError } = await supabase
          .from(TABLES.COURSE_ENROLLMENTS)
          .delete()
          .eq('course_id', courseId);

        if (enrollmentsError) {
          throw new Error(`Failed to delete enrollments: ${enrollmentsError.message}`);
        }

        // Delete company course assignments
        const { error: companyAssignmentsError } = await supabase
          .from(TABLES.COMPANY_COURSE_ASSIGNMENTS)
          .delete()
          .eq('course_id', courseId);

        if (companyAssignmentsError) {
          throw new Error(`Failed to delete company course assignments: ${companyAssignmentsError.message}`);
        }

        // Delete company employee course assignments
        const { error: employeeAssignmentsError } = await supabase
          .from(TABLES.COMPANY_EMPLOYEE_COURSE_ASSIGNMENTS)
          .delete()
          .eq('course_id', courseId);

        if (employeeAssignmentsError) {
          throw new Error(`Failed to delete employee course assignments: ${employeeAssignmentsError.message}`);
        }

        // Delete certificates - must be done before course deletion
        // Check if there are any certificates first
        const { data: existingCertificates, error: checkCertError } = await supabase
          .from(TABLES.CERTIFICATES)
          .select('id')
          .eq('course_id', courseId);

        if (checkCertError) {
          throw new Error(`Failed to check certificates: ${checkCertError.message}`);
        }

        // Delete certificates if any exist
        if (existingCertificates && existingCertificates.length > 0) {
          const { error: certificatesError } = await supabase
            .from(TABLES.CERTIFICATES)
            .delete()
            .eq('course_id', courseId);

          if (certificatesError) {
            throw new Error(`Failed to delete certificates: ${certificatesError.message}`);
          }
        }

        // Finally, delete the course
        const { error: courseError } = await supabase
          .from(TABLES.COURSES)
          .delete()
          .eq('id', courseId);

        if (courseError) {
          throw new Error(`Failed to delete course: ${courseError.message}`);
        }

        // Update local state
        set(state => ({
          courses: state.courses.filter(c => c.id !== courseId)
        }));

        return { success: true, error: null };
      } catch (error) {
        // Check for specific error types and provide user-friendly messages
        if (error.message?.includes('infinite recursion') || error.code === '42P17') {
          // This is a database policy recursion error - provide helpful message
          return { 
            success: false, 
            error: 'Unable to delete course. This course is currently being used by certificates, student enrollments, or company assignments. Please contact an administrator to resolve this issue.' 
          };
        }
        
        if (error.message?.includes('foreign key') || error.code === '23503') {
          // Foreign key constraint error
          return { 
            success: false, 
            error: 'Unable to delete course. This course is currently being used by certificates, student enrollments, or company assignments. Please remove all associated data before deleting.' 
          };
        }
        
        return { success: false, error: error.message || 'Failed to delete course. Please ensure all related data is removed first.' };
      }
    },

    // Course Management: Publish/Unpublish course
    toggleCoursePublish: async (courseId, isPublished) => {
      try {
        const { data, error } = await supabase
          .from(TABLES.COURSES)
          .update({
            is_published: isPublished,
            status: isPublished ? 'published' : 'draft',
            updated_at: new Date().toISOString()
          })
          .eq('id', courseId)
          .select()
          .single();

        if (error) throw error;

        // Don't refresh here to prevent infinite loops
        // The store will update automatically

        return { data, error: null };
      } catch (error) {
        return { data: null, error: error.message };
      }
    },

    // Lesson Management: Create lesson
    createLesson: async (lessonData, courseId, createdBy) => {
      try {
        // Enforce unique lesson title within the course when module is not specified
        if (lessonData?.title && !lessonData?.module_id) {
          const { data: existing } = await supabase
            .from(TABLES.LESSONS)
            .select('id')
            .eq('course_id', courseId)
            .is('module_id', null)
            .ilike('title', lessonData.title)
            .limit(1);
          if (existing && existing.length > 0) {
            return { data: null, error: 'A lesson with this title already exists in this course' };
          }
        }

        // Get current lesson count for order_index
        let existingLessons = [];
        let orderError = null;
        let orderQuery = await supabase
          .from(TABLES.LESSONS)
          .select('order_index')
          .eq('course_id', courseId)
          .order('order_index', { ascending: false })
          .limit(1);

        if (orderQuery.error && (orderQuery.error.message?.includes('order_index') || orderQuery.error.code === '42703')) {
          const fallback = await supabase
            .from(TABLES.LESSONS)
            .select('created_at')
            .eq('course_id', courseId)
            .order('created_at', { ascending: false })
            .limit(1);
          existingLessons = fallback.data || [];
          orderError = fallback.error;
        } else {
          existingLessons = orderQuery.data || [];
          orderError = orderQuery.error;
        }

        if (orderError) throw orderError;

        const originalOrderSupported = !(orderQuery.error && (orderQuery.error.message?.includes('order_index') || orderQuery.error.code === '42703'));
        const hasOrderIndex = existingLessons.length > 0 && existingLessons[0].order_index !== undefined;
        const nextOrderIndex = hasOrderIndex
          ? (existingLessons[0].order_index || 0) + 1
          : 1;

        const insertPayload = {
          ...lessonData,
          course_id: courseId,
          created_by: createdBy,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        if (originalOrderSupported) {
          insertPayload.order_index = nextOrderIndex;
        }

        let { data, error } = await supabase
          .from(TABLES.LESSONS)
          .insert(insertPayload)
          .select()
          .single();

        if (error && (error.message?.includes('order_index') || error.code === '42703')) {
          delete insertPayload.order_index;
          const retry = await supabase
            .from(TABLES.LESSONS)
            .insert(insertPayload)
            .select()
            .single();
          data = retry.data;
          error = retry.error;
        }

        if (error) throw error;

        return { data, error: null };
      } catch (error) {
        return { data: null, error: error.message };
      }
    },

    // Lesson Management: Update lesson
    updateLesson: async (lessonId, updates) => {
      try {
        // Enforce unique lesson title within its module (or course if unassigned)
        if (updates?.title) {
          const { data: current } = await supabase
            .from(TABLES.LESSONS)
            .select('course_id,module_id')
            .eq('id', lessonId)
            .single();

          if (current?.course_id !== undefined) {
            let query = supabase
              .from(TABLES.LESSONS)
              .select('id')
              .eq('course_id', current.course_id)
              .ilike('title', updates.title)
              .neq('id', lessonId)
              .limit(1);

            if (current.module_id) {
              query = query.eq('module_id', current.module_id);
            } else {
              query = query.is('module_id', null);
            }

            const { data: existing } = await query;
            if (existing && existing.length > 0) {
              return { data: null, error: 'A lesson with this title already exists in this module/course' };
            }
          }
        }

        const { data, error } = await supabase
          .from(TABLES.LESSONS)
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', lessonId)
          .select()
          .single();

        if (error) throw error;

        return { data, error: null };
      } catch (error) {
        return { data: null, error: error.message };
      }
    },

    // Lesson Management: Delete lesson
    deleteLesson: async (lessonId) => {
      try {
        const { error } = await supabase
          .from(TABLES.LESSONS)
          .delete()
          .eq('id', lessonId);

        if (error) throw error;

        return { success: true, error: null };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },

    // Lesson Management: Reorder lessons
    reorderLessons: async (courseId, lessonOrder) => {
      try {
        const updates = lessonOrder.map((lessonId, index) => ({
          id: lessonId,
          order_index: index + 1
        }));

        const { error } = await supabase
          .from(TABLES.LESSONS)
          .upsert(updates, { onConflict: 'id' });

        if (error) throw error;

        return { success: true, error: null };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },

    // Lesson Management: Get lessons for a course
    fetchCourseLessons: async (courseId) => {
      try {
        const { data, error } = await supabase
          .from(TABLES.LESSONS)
          .select('*')
          .eq('course_id', courseId)
          .order('order_index', { ascending: true });

        if (error) throw error;

        return { data: data || [], error: null };
      } catch (error) {
        return { data: [], error: error.message };
      }
    },

    // Lightweight counts for modules and lessons per course
    getCourseCounts: async (courseId) => {
      try {
        const [{ count: modulesCount }, { count: lessonsCount }] = await Promise.all([
          supabase
            .from(TABLES.COURSE_MODULES)
            .select('id', { count: 'exact', head: true })
            .eq('course_id', courseId),
          supabase
            .from(TABLES.LESSONS)
            .select('id', { count: 'exact', head: true })
            .eq('course_id', courseId),
        ]);

        return { data: { modules: modulesCount || 0, lessons: lessonsCount || 0 }, error: null };
      } catch (error) {
        return { data: { modules: 0, lessons: 0 }, error: error.message };
      }
    },

    // Category Management: Fetch all categories
    fetchCategories: async () => {
      set((state) => ({
        loading: { ...state.loading, categories: true },
        error: null,
      }));

      try {
        const { data, error } = await supabase
          .from(TABLES.COURSE_CATEGORIES)
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;

        set((state) => ({
          categories: data || [],
          loading: { ...state.loading, categories: false },
        }));

        return { data: data || [], error: null };
      } catch (error) {
        set((state) => ({
          error: error.message,
          loading: { ...state.loading, categories: false },
        }));
        return { data: [], error: error.message };
      }
    },

    // Category Management: Create new category
    createCategory: async (categoryData, createdBy) => {
      try {
        const { data, error } = await supabase
          .from(TABLES.COURSE_CATEGORIES)
          .insert({
            ...categoryData,
            created_by: createdBy,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;

        return { data, error: null };
      } catch (error) {
        return { data: null, error: error.message };
      }
    },

    // Category Management: Update category
    updateCategory: async (categoryId, updates) => {
      try {
        const { data, error } = await supabase
          .from(TABLES.COURSE_CATEGORIES)
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', categoryId)
          .select()
          .single();

        if (error) throw error;

        return { data, error: null };
      } catch (error) {
        return { data: null, error: error.message };
      }
    },

    // Category Management: Delete category
    deleteCategory: async (categoryId) => {
      try {
        const { error } = await supabase
          .from(TABLES.COURSE_CATEGORIES)
          .delete()
          .eq('id', categoryId);

        if (error) throw error;

        return { success: true, error: null };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },

    // Module Management: Fetch modules for a course
    fetchCourseModules: async (courseId) => {
      set((state) => ({
        loading: { ...state.loading, modules: true },
        error: null,
      }));

      try {
        const { data, error } = await supabase
          .from(TABLES.COURSE_MODULES)
          .select('*')
          .eq('course_id', courseId)
          .order('order_index', { ascending: true });

        if (error) throw error;

        // Update local state
        set((state) => ({
          courseModules: {
            ...state.courseModules,
            [courseId]: data || []
          },
          loading: { ...state.loading, modules: false },
        }));

        return { data: data || [], error: null };
      } catch (error) {
        set((state) => ({
          error: error.message,
          loading: { ...state.loading, modules: false },
        }));
        return { data: [], error: error.message };
      }
    },

    // Module Management: Create new module
    createModule: async (moduleData, courseId, createdBy) => {
      try {
        // Enforce unique module title within a course (case-insensitive)
        if (moduleData?.title) {
          const { data: existing } = await supabase
            .from(TABLES.COURSE_MODULES)
            .select('id')
            .eq('course_id', courseId)
            .ilike('title', moduleData.title)
            .limit(1);
          if (existing && existing.length > 0) {
            return { data: null, error: 'A module with this title already exists in this course' };
          }
        }

        // Get current module count for order_index
        const { data: existingModules } = await supabase
          .from(TABLES.COURSE_MODULES)
          .select('order_index')
          .eq('course_id', courseId)
          .order('order_index', { ascending: false })
          .limit(1);

        const nextOrderIndex = existingModules && existingModules.length > 0 
          ? existingModules[0].order_index + 1 
          : 1;

        const { data, error } = await supabase
          .from(TABLES.COURSE_MODULES)
          .insert({
            ...moduleData,
            course_id: courseId,
            created_by: createdBy,
            order_index: nextOrderIndex,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;

        // Update local state
        const currentModules = get().courseModules[courseId] || [];
        set((state) => ({
          courseModules: {
            ...state.courseModules,
            [courseId]: [...currentModules, data]
          }
        }));

        return { data, error: null };
      } catch (error) {
        return { data: null, error: error.message };
      }
    },

    // Module Management: Update module
    updateModule: async (moduleId, updates) => {
      try {
        // Enforce unique module title within a course on update (case-insensitive)
        if (updates?.title) {
          const { data: current } = await supabase
            .from(TABLES.COURSE_MODULES)
            .select('course_id')
            .eq('id', moduleId)
            .single();

          if (current?.course_id) {
            const { data: existing } = await supabase
              .from(TABLES.COURSE_MODULES)
              .select('id')
              .eq('course_id', current.course_id)
              .ilike('title', updates.title)
              .neq('id', moduleId)
              .limit(1);
            if (existing && existing.length > 0) {
              return { data: null, error: 'A module with this title already exists in this course' };
            }
          }
        }

        const { data, error } = await supabase
          .from(TABLES.COURSE_MODULES)
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', moduleId)
          .select()
          .single();

        if (error) throw error;

        // Update local state
        set((state) => ({
          courseModules: Object.keys(state.courseModules).reduce((acc, courseId) => {
            acc[courseId] = state.courseModules[courseId].map(module =>
              module.id === moduleId ? { ...module, ...updates } : module
            );
            return acc;
          }, {})
        }));

        return { data, error: null };
      } catch (error) {
        return { data: null, error: error.message };
      }
    },

    // Module Management: Delete module
    deleteModule: async (moduleId, courseId) => {
      try {
        const { error } = await supabase
          .from(TABLES.COURSE_MODULES)
          .delete()
          .eq('id', moduleId);

        if (error) throw error;

        // Update local state
        set((state) => ({
          courseModules: {
            ...state.courseModules,
            [courseId]: state.courseModules[courseId]?.filter(module => module.id !== moduleId) || []
          }
        }));

        return { success: true, error: null };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },

    // Module Management: Reorder modules
    reorderModules: async (courseId, moduleOrder) => {
      try {
        const updates = moduleOrder.map((moduleId, index) => ({
          id: moduleId,
          order_index: index + 1
        }));

        const { error } = await supabase
          .from(TABLES.COURSE_MODULES)
          .upsert(updates, { onConflict: 'id' });

        if (error) throw error;

        // Update local state
        set((state) => ({
          courseModules: {
            ...state.courseModules,
            [courseId]: state.courseModules[courseId]?.map(module => {
              const update = updates.find(u => u.id === module.id);
              return update ? { ...module, order_index: update.order_index } : module;
            }).sort((a, b) => a.order_index - b.order_index) || []
          }
        }));

        return { success: true, error: null };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },

    // Enhanced Lesson Management: Create lesson with module support
    createLesson: async (lessonData, courseId, moduleId, createdBy) => {
      try {
        // Enforce unique lesson title within the module (or course if moduleId is null)
        if (lessonData?.title) {
          let query = supabase
            .from(TABLES.LESSONS)
            .select('id')
            .eq('course_id', courseId)
            .ilike('title', lessonData.title)
            .limit(1);

          if (moduleId) {
            query = query.eq('module_id', moduleId);
          } else {
            query = query.is('module_id', null);
          }

          const { data: existing } = await query;
          if (existing && existing.length > 0) {
            return { data: null, error: 'A lesson with this title already exists in this module/course' };
          }
        }

        // Get current lesson count for order_index within the module
        const { data: existingLessons } = await supabase
          .from(TABLES.LESSONS)
          .select('order_index')
          .eq('course_id', courseId)
          .eq('module_id', moduleId)
          .order('order_index', { ascending: false })
          .limit(1);

        const nextOrderIndex = existingLessons && existingLessons.length > 0 
          ? existingLessons[0].order_index + 1 
          : 1;

        const { data, error } = await supabase
          .from(TABLES.LESSONS)
          .insert({
            ...lessonData,
            course_id: courseId,
            module_id: moduleId,
            created_by: createdBy,
            order_index: nextOrderIndex,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;

        return { data, error: null };
      } catch (error) {
        return { data: null, error: error.message };
      }
    },

    // Enhanced Lesson Management: Get lessons for a course with module grouping
    fetchCourseLessons: async (courseId) => {
      try {
        const { data, error } = await supabase
          .from(TABLES.LESSONS)
          .select(`
            *,
            module:${TABLES.COURSE_MODULES}(id, title, order_index)
          `)
          .eq('course_id', courseId)
          .order('order_index', { ascending: true });

        if (error) throw error;

        // Group lessons by module and sort by module order
        const groupedLessons = {};
        data?.forEach(lesson => {
          const moduleId = lesson.module?.id || 'unassigned';
          if (!groupedLessons[moduleId]) {
            groupedLessons[moduleId] = {
              module: lesson.module || { id: 'unassigned', title: 'Unassigned Lessons', order_index: 999 },
              lessons: []
            };
          }
          groupedLessons[moduleId].lessons.push(lesson);
        });

        // Sort modules by order_index and lessons within each module
        const sortedGroupedLessons = {};
        Object.keys(groupedLessons)
          .sort((a, b) => {
            const moduleA = groupedLessons[a].module;
            const moduleB = groupedLessons[b].module;
            return (moduleA.order_index || 999) - (moduleB.order_index || 999);
          })
          .forEach(moduleId => {
            const moduleData = groupedLessons[moduleId];
            // Sort lessons within the module by their order_index
            moduleData.lessons.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
            sortedGroupedLessons[moduleId] = moduleData;
          });

        return { data: sortedGroupedLessons, error: null };
      } catch (error) {
        return { data: {}, error: error.message };
      }
    },

    // Title uniqueness helpers
    isCourseTitleUnique: async (title, excludeId = null) => {
      try {
        let query = supabase
          .from(TABLES.COURSES)
          .select('id')
          .ilike('title', title)
          .limit(1);
        if (excludeId) query = query.neq('id', excludeId);
        const { data } = await query;
        return !data || data.length === 0;
      } catch (error) {
        return false;
      }
    },

    isModuleTitleUnique: async (courseId, title, excludeId = null) => {
      try {
        let query = supabase
          .from(TABLES.COURSE_MODULES)
          .select('id')
          .eq('course_id', courseId)
          .ilike('title', title)
          .limit(1);
        if (excludeId) query = query.neq('id', excludeId);
        const { data } = await query;
        return !data || data.length === 0;
      } catch (error) {
        return false;
      }
    },

    isLessonTitleUnique: async (courseId, moduleId, title, excludeId = null) => {
      try {
        let query = supabase
          .from(TABLES.LESSONS)
          .select('id')
          .eq('course_id', courseId)
          .ilike('title', title)
          .limit(1);
        if (moduleId) {
          query = query.eq('module_id', moduleId);
        } else {
          query = query.is('module_id', null);
        }
        if (excludeId) query = query.neq('id', excludeId);
        const { data } = await query;
        return !data || data.length === 0;
      } catch (error) {
        return false;
      }
    },

    // Lesson Management: Fetch single lesson
    fetchLesson: async (lessonId) => {
      try {
        const { data, error } = await supabase
          .from(TABLES.LESSONS)
          .select('*')
          .eq('id', lessonId)
          .single();
        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        return { data: null, error: error.message };
      }
    },

    // Presentation Management Functions
    createPresentation: async (presentationData) => {
      try {
        const { data, error } = await supabase
          .from(TABLES.LESSON_PRESENTATIONS)
          .insert({
            ...presentationData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        return { data: null, error: error.message };
      }
    },

    updatePresentation: async (presentationId, updates) => {
      try {
        const { data, error } = await supabase
          .from(TABLES.LESSON_PRESENTATIONS)
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', presentationId)
          .select()
          .single();
        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        return { data: null, error: error.message };
      }
    },

    deletePresentation: async (presentationId) => {
      try {
        const { error } = await supabase
          .from(TABLES.LESSON_PRESENTATIONS)
          .delete()
          .eq('id', presentationId);
        if (error) throw error;
        return { success: true, error: null };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },

    fetchPresentation: async (presentationId) => {
      try {
        const { data, error } = await supabase
          .from(TABLES.LESSON_PRESENTATIONS)
          .select(`
            *,
            slides:${TABLES.PRESENTATION_SLIDES}(*)
          `)
          .eq('id', presentationId)
          .single();
        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        return { data: null, error: error.message };
      }
    },

    fetchPresentationByLesson: async (lessonId) => {
      try {
        const { data, error } = await supabase
          .from(TABLES.LESSON_PRESENTATIONS)
          .select(`
            *,
            slides:${TABLES.PRESENTATION_SLIDES}(*)
          `)
          .eq('lesson_id', lessonId)
          .single();
        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        return { data: null, error: error.message };
      }
    },

    createSlide: async (slideData) => {
      try {
        const { data, error } = await supabase
          .from(TABLES.PRESENTATION_SLIDES)
          .insert({
            ...slideData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        return { data: null, error: error.message };
      }
    },

    updateSlide: async (slideId, updates) => {
      try {
        const { data, error } = await supabase
          .from(TABLES.PRESENTATION_SLIDES)
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', slideId)
          .select()
          .single();
        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        return { data: null, error: error.message };
      }
    },

    deleteSlide: async (slideId) => {
      try {
        const { error } = await supabase
          .from(TABLES.PRESENTATION_SLIDES)
          .delete()
          .eq('id', slideId);
        if (error) throw error;
        return { success: true, error: null };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },

    reorderSlides: async (presentationId, slideIds) => {
      try {
        // Use a more efficient approach to avoid conflicts
        // First, set all slide numbers to temporary values to avoid unique constraint conflicts
        const tempUpdates = slideIds.map((slideId, index) => ({
          id: slideId,
          slide_number: -(index + 1) // Use negative numbers temporarily
        }));

        // Update all slides to temporary numbers first
        for (const update of tempUpdates) {
          const { error } = await supabase
            .from(TABLES.PRESENTATION_SLIDES)
            .update({ slide_number: update.slide_number })
            .eq('id', update.id);
          if (error) throw error;
        }

        // Now update to final numbers
        const finalUpdates = slideIds.map((slideId, index) => ({
          id: slideId,
          slide_number: index + 1
        }));

        for (const update of finalUpdates) {
          const { error } = await supabase
            .from(TABLES.PRESENTATION_SLIDES)
            .update({ slide_number: update.slide_number })
            .eq('id', update.id);
          if (error) throw error;
        }

        return { success: true, error: null };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },

    // ==========================================
    // PRESENTATION PROGRESS TRACKING
    // ==========================================

    // Track slide completion and time spent
    updateSlideProgress: async (userId, slideId, presentationId, lessonId, courseId, metadata = {}) => {
      try {
        // Check if slide_progress table exists by trying to query it
        const { data: testData, error: testError } = await supabase
          .from(TABLES.SLIDE_PROGRESS)
          .select('id')
          .limit(1);

        // Handle table not found errors gracefully
        if (testError && isTableNotFoundError(testError)) {
          // Table doesn't exist, skip slide progress tracking
          return { data: null, error: null };
        }

        const progressData = {
          user_id: userId,
          slide_id: slideId,
          presentation_id: presentationId,
          lesson_id: lessonId,
          course_id: courseId,
          viewed_at: new Date().toISOString(),
          time_spent_seconds: metadata.timeSpent || 0,
          completed: metadata.completed || true,
          metadata: {
            ...metadata,
            slide_order: metadata.slideOrder,
            quiz_scores: metadata.quizScores || {},
            interactions: metadata.interactions || {}
          },
        };

        const { data, error } = await supabase
          .from(TABLES.SLIDE_PROGRESS)
          .upsert(progressData, {
            onConflict: 'user_id,slide_id',
            ignoreDuplicates: false
          })
          .select()
          .single();

        if (error) throw error;

        // Update overall presentation progress
        await get().actions.calculatePresentationProgress(userId, presentationId, lessonId, courseId);

        return { data, error: null };
      } catch (error) {
        return { data: null, error: error.message };
      }
    },

    // Calculate and update presentation progress
    calculatePresentationProgress: async (userId, presentationId, lessonId, courseId) => {
      try {
        // Check if presentation_progress table exists
        const { data: testData, error: testError } = await supabase
          .from(TABLES.PRESENTATION_PROGRESS)
          .select('id')
          .limit(1);

        // Handle table not found errors gracefully
        if (testError && isTableNotFoundError(testError)) {
          // Table doesn't exist, skip presentation progress tracking
          return { data: null, error: null };
        }

        // Get total slides in presentation
        const { data: allSlides, error: slidesError } = await supabase
          .from(TABLES.PRESENTATION_SLIDES)
          .select('id')
          .eq('presentation_id', presentationId)
          .order('slide_number', { ascending: true });

        if (slidesError) throw slidesError;

        // Get completed slides
        const { data: completedSlides, error: progressError } = await supabase
          .from(TABLES.SLIDE_PROGRESS)
          .select('slide_id, time_spent_seconds, metadata')
          .eq('user_id', userId)
          .eq('presentation_id', presentationId)
          .eq('completed', true);

        if (progressError) throw progressError;

        const totalSlides = allSlides?.length || 0;
        const completedCount = completedSlides?.length || 0;
        const progressPercentage = totalSlides > 0 ? Math.round((completedCount / totalSlides) * 100) : 0;

        // Calculate total time spent
        const totalTimeSpent = completedSlides?.reduce((sum, slide) =>
          sum + (slide.time_spent_seconds || 0), 0) || 0;

        // Aggregate quiz scores if any
        const quizScores = {};
        completedSlides?.forEach(slide => {
          if (slide.metadata?.quizScores) {
            Object.assign(quizScores, slide.metadata.quizScores);
          }
        });

        // Update or create presentation progress record
        const progressData = {
          user_id: userId,
          presentation_id: presentationId,
          lesson_id: lessonId,
          course_id: courseId,
          progress_percentage: progressPercentage,
          completed_slides: completedCount,
          total_slides: totalSlides,
          total_time_spent_seconds: totalTimeSpent,
          completed: progressPercentage === 100,
          completed_at: progressPercentage === 100 ? new Date().toISOString() : null,
          last_accessed: new Date().toISOString(),
          metadata: {
            quiz_scores: quizScores,
            last_slide_viewed: completedSlides?.length > 0 ?
              completedSlides[completedSlides.length - 1].slide_id : null,
          },
        };

        const { data, error } = await supabase
          .from(TABLES.PRESENTATION_PROGRESS)
          .upsert(progressData, {
            onConflict: 'user_id,presentation_id',
            ignoreDuplicates: false
          })
          .select()
          .single();

        if (error) throw error;

        // If presentation is completed, update lesson progress
        if (progressPercentage === 100) {
          await get().actions.updateLessonProgress(
            userId,
            lessonId,
            courseId,
            true,
            {
              completed_via: 'presentation',
              presentation_id: presentationId,
              slides_completed: completedCount,
              total_time_spent: totalTimeSpent,
              quiz_scores: quizScores,
              completed_at: new Date().toISOString()
            }
          );
        }

        return { data, error: null };
      } catch (error) {
        return { data: null, error: error.message };
      }
    },

    // Fetch presentation progress for a user
    fetchPresentationProgress: async (userId, presentationId) => {
      try {
        const { data, error } = await supabase
          .from(TABLES.PRESENTATION_PROGRESS)
          .select('*')
          .eq('user_id', userId)
          .eq('presentation_id', presentationId)
          .single();

        // Handle table not found errors gracefully
        if (error && !isTableNotFoundError(error)) {
          throw error;
        }
        return { data: data || null, error: null };
      } catch (error) {
        // If it's a table not found error, return null data gracefully
        if (isTableNotFoundError(error)) {
          return { data: null, error: null };
        }
        return { data: null, error: error.message };
      }
    },

    // Fetch slide progress for a presentation
    fetchSlideProgress: async (userId, presentationId) => {
      try {
        const { data, error } = await supabase
          .from(TABLES.SLIDE_PROGRESS)
          .select('*')
          .eq('user_id', userId)
          .eq('presentation_id', presentationId)
          .order('viewed_at', { ascending: true });

        // Handle table not found errors gracefully
        if (error && !isTableNotFoundError(error)) {
          throw error;
        }
        return { data: data || [], error: null };
      } catch (error) {
        // If it's a table not found error, return empty array gracefully
        if (isTableNotFoundError(error)) {
          return { data: [], error: null };
        }
        return { data: [], error: error.message };
      }
    },

    // Track quiz completion within presentations
    submitPresentationQuizAttempt: async (userId, quizId, slideId, presentationId, answers, score, maxScore = null) => {
      try {
        // Submit the quiz attempt using existing function
        const quizResult = await get().actions.submitQuizAttempt(userId, quizId, answers, score, maxScore);

        if (quizResult.error) throw new Error(quizResult.error);

        // Update slide progress with quiz data
        const metadata = {
          completed: true,
          quizScores: {
            [quizId]: {
              score,
              maxScore,
              percentage: quizResult.data.percentage,
              passed: quizResult.data.passed,
              completed_at: new Date().toISOString()
            }
          },
          interactions: {
            quiz_completed: true,
            quiz_id: quizId
          }
        };

        // Get slide info for better tracking
        const { data: slideData } = await supabase
          .from(TABLES.PRESENTATION_SLIDES)
          .select('slide_number, presentation_id, lesson_id')
          .eq('id', slideId)
          .single();

        await get().actions.updateSlideProgress(
          userId,
          slideId,
          presentationId,
          slideData?.lesson_id,
          slideData?.course_id, // We'll need to get this from lesson or presentation
          {
            ...metadata,
            slideOrder: slideData?.slide_number
          }
        );

        return { data: quizResult.data, error: null };
      } catch (error) {
        return { data: null, error: error.message };
      }
    },

    // Get detailed progress analytics for presentations
    getPresentationAnalytics: async (userId, courseId = null) => {
      try {
        let query = supabase
          .from(TABLES.PRESENTATION_PROGRESS)
          .select(`
            *,
            presentation:${TABLES.LESSON_PRESENTATIONS}(id, title, lesson_id),
            lesson:${TABLES.LESSONS}(id, title, course_id)
          `)
          .eq('user_id', userId);

        if (courseId) {
          query = query.eq('course_id', courseId);
        }

        const { data, error } = await query.order('last_accessed', { ascending: false });

        if (error) throw error;

        // Calculate summary statistics
        const analytics = {
          total_presentations: data?.length || 0,
          completed_presentations: data?.filter(p => p.completed).length || 0,
          total_slides_viewed: data?.reduce((sum, p) => sum + (p.completed_slides || 0), 0) || 0,
          total_time_spent: data?.reduce((sum, p) => sum + (p.total_time_spent_seconds || 0), 0) || 0,
          average_completion_rate: data?.length > 0 ?
            data.reduce((sum, p) => sum + (p.progress_percentage || 0), 0) / data.length : 0,
          presentations: data || []
        };

        return { data: analytics, error: null };
      } catch (error) {
        return { data: null, error: error.message };
      }
    },

    // Debug function to test database connection and tables
    testPresentationTables: async () => {
      try {
        // Test if lesson_presentations table exists
        const { data: presentations, error: presError } = await supabase
          .from(TABLES.LESSON_PRESENTATIONS)
          .select('id')
          .limit(1);
        
        if (presError) {
          return { 
            success: false, 
            error: `lesson_presentations table error: ${presError.message}`,
            tables: { lesson_presentations: false, presentation_slides: false }
          };
        }

        // Test if presentation_slides table exists
        const { data: slides, error: slidesError } = await supabase
          .from(TABLES.PRESENTATION_SLIDES)
          .select('id')
          .limit(1);
        
        if (slidesError) {
          return { 
            success: false, 
            error: `presentation_slides table error: ${slidesError.message}`,
            tables: { lesson_presentations: true, presentation_slides: false }
          };
        }

        return { 
          success: true, 
          error: null,
          tables: { lesson_presentations: true, presentation_slides: true }
        };
      } catch (error) {
        return { 
          success: false, 
          error: error.message,
          tables: { lesson_presentations: false, presentation_slides: false }
        };
      }
    },

    // Review Management: Fetch reviews for a course
    fetchCourseReviews: async (courseId) => {
      try {
        const { data: reviews, error: reviewsError } = await supabase
          .from(TABLES.COURSE_REVIEWS)
          .select('*')
          .eq('course_id', courseId)
          .order('created_at', { ascending: false });

        if (reviewsError) throw reviewsError;

        if (!reviews || reviews.length === 0) {
          return { data: [], error: null };
        }

        // Fetch user profiles for all reviews
        const userIds = [...new Set(reviews.map(r => r.user_id))];
        const { data: profiles, error: profilesError } = await supabase
          .from(TABLES.PROFILES)
          .select('id, first_name, last_name, avatar_url')
          .in('id', userIds);

        if (profilesError) {
          // If profiles fetch fails, return reviews without user data
          return { data: reviews, error: null };
        }

        // Merge user data with reviews
        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
        const reviewsWithUsers = reviews.map(review => ({
          ...review,
          user: profilesMap.get(review.user_id) || null
        }));

        return { data: reviewsWithUsers, error: null };
      } catch (error) {
        return { data: [], error: error.message };
      }
    },

    // Review Management: Get user's review for a course
    getUserReview: async (courseId, userId) => {
      try {
        const { data, error } = await supabase
          .from(TABLES.COURSE_REVIEWS)
          .select('*')
          .eq('course_id', courseId)
          .eq('user_id', userId)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        return { data: data || null, error: null };
      } catch (error) {
        return { data: null, error: error.message };
      }
    },

    // Review Management: Create or update review
    createOrUpdateReview: async (courseId, userId, reviewData) => {
      try {
        if (!reviewData.rating || reviewData.rating < 1 || reviewData.rating > 5) {
          return { data: null, error: 'Rating must be between 1 and 5' };
        }

        // Check if review already exists
        const { data: existing } = await supabase
          .from(TABLES.COURSE_REVIEWS)
          .select('id')
          .eq('course_id', courseId)
          .eq('user_id', userId)
          .single();

        let result;
        if (existing) {
          // Update existing review
          const { data, error } = await supabase
            .from(TABLES.COURSE_REVIEWS)
            .update({
              rating: reviewData.rating,
              comment: reviewData.comment || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)
            .select()
            .single();

          if (error) throw error;
          result = data;
        } else {
          // Create new review
          const { data, error } = await supabase
            .from(TABLES.COURSE_REVIEWS)
            .insert({
              course_id: courseId,
              user_id: userId,
              rating: reviewData.rating,
              comment: reviewData.comment || null
            })
            .select()
            .single();

          if (error) throw error;
          result = data;
        }

        return { data: result, error: null };
      } catch (error) {
        return { data: null, error: error.message };
      }
    },

    // Review Management: Update review
    updateReview: async (reviewId, reviewData) => {
      try {
        if (reviewData.rating && (reviewData.rating < 1 || reviewData.rating > 5)) {
          return { data: null, error: 'Rating must be between 1 and 5' };
        }

        const updateData = {
          updated_at: new Date().toISOString()
        };

        if (reviewData.rating !== undefined) {
          updateData.rating = reviewData.rating;
        }
        if (reviewData.comment !== undefined) {
          updateData.comment = reviewData.comment || null;
        }

        const { data, error } = await supabase
          .from(TABLES.COURSE_REVIEWS)
          .update(updateData)
          .eq('id', reviewId)
          .select()
          .single();

        if (error) throw error;

        return { data, error: null };
      } catch (error) {
        return { data: null, error: error.message };
      }
    },

    // Review Management: Delete review
    deleteReview: async (reviewId) => {
      try {
        const { error } = await supabase
          .from(TABLES.COURSE_REVIEWS)
          .delete()
          .eq('id', reviewId);

        if (error) throw error;

        return { data: true, error: null };
      } catch (error) {
        return { data: null, error: error.message };
      }
    },

    // Review Management: Get course rating statistics
    getCourseRatingStats: async (courseId) => {
      try {
        const { data: reviews, error } = await supabase
          .from(TABLES.COURSE_REVIEWS)
          .select('rating')
          .eq('course_id', courseId);

        if (error) throw error;

        if (!reviews || reviews.length === 0) {
          return {
            data: {
              averageRating: 0,
              totalReviews: 0,
              ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
            },
            error: null
          };
        }

        const totalReviews = reviews.length;
        const sumRatings = reviews.reduce((sum, r) => sum + r.rating, 0);
        const averageRating = totalReviews > 0 ? sumRatings / totalReviews : 0;

        const ratingDistribution = reviews.reduce((acc, r) => {
          acc[r.rating] = (acc[r.rating] || 0) + 1;
          return acc;
        }, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

        return {
          data: {
            averageRating: Math.round(averageRating * 10) / 10,
            totalReviews,
            ratingDistribution
          },
          error: null
        };
      } catch (error) {
        return { data: null, error: error.message };
      }
    },
  },
}));

export { useCourseStore }; 
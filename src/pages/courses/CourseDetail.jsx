// src/pages/courses/CourseDetail.jsx
import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useCourseStore } from '@/store/courseStore'
import { useAuth } from '@/hooks/auth/useAuth'
import { useSubscription } from '@/hooks/courses/useSubscription'
import {
  Play,
  Clock,
  Users,
  Star,
  Award,
  BookOpen,
  CheckCircle,
  Download,
  Share2,
  Heart,
  ChevronDown,
  ChevronRight,
  Globe,
  Smartphone,
  Layers,
  Edit3,
  ExternalLink,
  File,
  Lock,
  Crown,
  ArrowRight
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ShareCourseModal from '@/components/course/ShareCourseModal'
import { useToast } from '@/components/ui'
import { UpgradeBanner, FreeTrialBadge } from '@/components/course/UpgradePrompt'
import CourseDiscussionPanel from '@/components/course/CourseDiscussionPanel'
import PageTitle from '@/components/layout/PageTitle'

const COURSE_DETAIL_TABS = ['overview', 'curriculum', 'instructor', 'reviews', 'resources', 'community']

/** Fractional 1–5 star row using theme-friendly amber fills (avoids non-existent Tailwind `*-warning-default` on stars). */
function AverageStarRow({ average, sizeClass = 'w-5 h-5', className = '' }) {
  const value = Math.min(5, Math.max(0, Number(average) || 0))
  const label = `${value.toFixed(1)} out of 5 stars`
  return (
    <div className={`flex items-center gap-0.5 ${className}`} role="img" aria-label={label}>
      {[1, 2, 3, 4, 5].map((star) => {
        const fillFraction = Math.min(1, Math.max(0, value - star + 1))
        return (
          <span key={star} className="relative inline-flex shrink-0" aria-hidden="true">
            <Star
              className={`${sizeClass} text-amber-200 fill-transparent dark:text-amber-900/50`}
              strokeWidth={1.35}
            />
            <span
              className="absolute left-0 top-0 h-full overflow-hidden pointer-events-none"
              style={{ width: `${fillFraction * 100}%` }}
            >
              <Star className={`${sizeClass} text-amber-500 fill-amber-400`} strokeWidth={0} />
            </span>
          </span>
        )
      })}
    </div>
  )
}

// Normalize URL to ensure it has a protocol (for existing data that might not have it)
const normalizeUrl = (url) => {
  if (!url) return url;
  const trimmed = url.trim();
  // If URL doesn't start with http:// or https://, add https://
  if (!trimmed.match(/^https?:\/\//i)) {
    return `https://${trimmed}`;
  }
  return trimmed;
};

// Download file helper function
const downloadFile = (url, filename) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || '';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function CourseDetail() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const { isFreeTrial, canAccessCourse, canAccessCertificates } = useSubscription()
  // Store selectors - individual to prevent infinite loops
  const courses = useCourseStore(state => state.courses);
  const enrolledCourses = useCourseStore(state => state.enrolledCourses);
  const courseProgress = useCourseStore(state => state.courseProgress);
  const loading = useCourseStore(state => state.loading);
  const error = useCourseStore(state => state.error);
  const fetchCourses = useCourseStore(state => state.actions.fetchCourses);
  const enrollInCourse = useCourseStore(state => state.actions.enrollInCourse);
  const fetchCourseLessons = useCourseStore(state => state.actions.fetchCourseLessons);
  const fetchCourseModules = useCourseStore(state => state.actions.fetchCourseModules);
  const fetchCourseProgress = useCourseStore(state => state.actions.fetchCourseProgress);
  const fetchEnrolledCourses = useCourseStore(state => state.actions.fetchEnrolledCourses);
  const fetchCourseReviews = useCourseStore(state => state.actions.fetchCourseReviews);
  const getCourseRatingStats = useCourseStore(state => state.actions.getCourseRatingStats);
  const getUserReview = useCourseStore(state => state.actions.getUserReview);
  const createOrUpdateReview = useCourseStore(state => state.actions.createOrUpdateReview);
  
  const tabFromUrl = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(() =>
    COURSE_DETAIL_TABS.includes(tabFromUrl) ? tabFromUrl : 'overview'
  )

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t && COURSE_DETAIL_TABS.includes(t)) {
      setActiveTab(t)
    }
  }, [searchParams])

  const handleTabChange = useCallback(
    (tabId) => {
      setActiveTab(tabId)
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (tabId === 'overview') {
            next.delete('tab')
          } else {
            next.set('tab', tabId)
          }
          return next
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )
  const [expandedModule, setExpandedModule] = useState(null)
  const [lessons, setLessons] = useState([])
  const [modules, setModules] = useState([])
  const [courseStructure, setCourseStructure] = useState({})
  const [reviews, setReviews] = useState([])
  const [ratingStats, setRatingStats] = useState(null)
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [userReview, setUserReview] = useState(null)
  const [draftRating, setDraftRating] = useState(0)
  const [draftComment, setDraftComment] = useState('')
  const [savingReview, setSavingReview] = useState(false)
  const { success, error: showError } = useToast()

  const refreshReviewsAndStats = useCallback(async () => {
    if (!courseId) return
    const [reviewsResult, statsResult] = await Promise.all([
      fetchCourseReviews(courseId),
      getCourseRatingStats(courseId),
    ])
    if (reviewsResult.data) setReviews(reviewsResult.data)
    if (statsResult.data) setRatingStats(statsResult.data)
  }, [courseId, fetchCourseReviews, getCourseRatingStats])

  // Function to fetch lessons for the course
  const loadCourseLessons = async () => {
    if (courseId) {
      try {
        const [lessonsResult, modulesResult] = await Promise.all([
          fetchCourseLessons(courseId),
          fetchCourseModules(courseId)
        ]);
        
        if (lessonsResult.data) {
          setLessons(Object.values(lessonsResult.data).flatMap(moduleData => moduleData.lessons || []));
          setCourseStructure(lessonsResult.data);
        }
        
        if (modulesResult.data) {
          setModules(modulesResult.data);
        }
      } catch (error) {
        // Handle error silently or set error state if needed
      }
    }
  }

  // Mock course data - in real app, this would come from your database
  const mockCourse = {
    id: courseId,
    title: 'Complete React Development Bootcamp',
    subtitle: 'Master React from basics to advanced concepts including hooks, context, and testing',
    description: `This comprehensive React course will take you from beginner to advanced developer. You'll learn modern React concepts, best practices, and build real-world projects that you can add to your portfolio.

    The course covers everything from basic components to advanced patterns like render props, higher-order components, and custom hooks. You'll also learn about testing, performance optimization, and deployment strategies.`,
    category: 'Technology',
    level: 'Intermediate',
    duration: 1800, // total minutes
    price: 99,
    originalPrice: 149,
    rating: 4.8,
    totalRatings: 2156,
    students: 12500,
    language: 'English',
    lastUpdated: '2024-01-15',
    instructor: {
      name: 'Sarah Chen',
      title: 'Senior Frontend Developer at Google',
      bio: 'Sarah has 8+ years of experience in frontend development and has taught over 50,000 students.',
      avatar: '👩‍💻',
      rating: 4.9,
      students: 15000,
      courses: 12
    },
    features: [
      '25+ hours of on-demand video',
      '50+ coding exercises',
      '10 real-world projects',
      'Lifetime access',
      'Certificate of completion',
      'Money-back guarantee',
      'Mobile and TV access',
      'Community support'
    ],
    requirements: [
      'Basic HTML and CSS knowledge',
      'JavaScript fundamentals (ES6+)',
      'A computer with internet access',
      'Code editor (VS Code recommended)'
    ],
    outcomes: [
      'Build modern React applications from scratch',
      'Master React hooks and context API',
      'Implement state management with Redux',
      'Write unit and integration tests',
      'Deploy applications to production',
      'Optimize React apps for performance'
    ],
    curriculum: [
      {
        id: 1,
        title: 'Getting Started with React',
        duration: 180,
        lessons: 8,
        lectures: [
          { id: '1-1', title: 'What is React?', duration: 15, type: 'video', free: true },
          { id: '1-2', title: 'Setting up Development Environment', duration: 25, type: 'video', free: true },
          { id: '1-3', title: 'Your First React Component', duration: 20, type: 'video', free: false },
          { id: '1-4', title: 'JSX Fundamentals', duration: 30, type: 'video', free: false },
          { id: '1-5', title: 'Props and Component Communication', duration: 35, type: 'video', free: false },
          { id: '1-6', title: 'Handling Events', duration: 25, type: 'video', free: false },
          { id: '1-7', title: 'State Management Basics', duration: 30, type: 'video', free: false },
          { id: '1-8', title: 'Project: Todo List App', duration: 45, type: 'project', free: false }
        ]
      },
      {
        id: 2,
        title: 'Advanced React Concepts',
        duration: 240,
        lessons: 12,
        lectures: [
          { id: '2-1', title: 'React Hooks Deep Dive', duration: 40, type: 'video', free: false },
          { id: '2-2', title: 'useEffect and Side Effects', duration: 35, type: 'video', free: false },
          { id: '2-3', title: 'Custom Hooks', duration: 30, type: 'video', free: false },
          { id: '2-4', title: 'Context API', duration: 25, type: 'video', free: false },
          { id: '2-5', title: 'Error Boundaries', duration: 20, type: 'video', free: false },
          // ... more lectures
        ]
      },
      {
        id: 3,
        title: 'State Management with Redux',
        duration: 200,
        lessons: 10,
        lectures: [
          { id: '3-1', title: 'Introduction to Redux', duration: 25, type: 'video', free: false },
          { id: '3-2', title: 'Actions and Reducers', duration: 30, type: 'video', free: false },
          // ... more lectures
        ]
      }
    ],
    reviews: [
      {
        id: 1,
        user: 'John Doe',
        avatar: '👨‍💼',
        rating: 5,
        date: '2024-01-10',
        comment: 'Excellent course! Very comprehensive and well-structured. Sarah explains complex concepts in a simple way.'
      },
      {
        id: 2,
        user: 'Jane Smith',
        avatar: '👩‍🎓',
        rating: 5,
        date: '2024-01-08',
        comment: 'The projects in this course are amazing. I built a real portfolio that helped me land my dream job!'
      },
      {
        id: 3,
        user: 'Mike Johnson',
        avatar: '👨‍💻',
        rating: 4,
        date: '2024-01-05',
        comment: 'Great content overall. The instructor is knowledgeable and the examples are practical.'
      }
    ]
  }

  // Get the current course from the store
  const course = courses?.find(c => c.id === courseId) || mockCourse
  
  // Check if user is enrolled
  const isEnrolled = enrolledCourses?.some(enrollment => 
    enrollment.course_id === courseId || enrollment.id === courseId
  )

  const isLocked = isFreeTrial && !canAccessCourse(course)

  const heroRatingCount =
    ratingStats != null ? ratingStats.totalReviews : (course?.totalRatings ?? 0)
  const heroRatingDisplay =
    ratingStats != null
      ? ratingStats.totalReviews > 0
        ? ratingStats.averageRating.toFixed(1)
        : '—'
      : course?.rating != null
        ? String(course.rating)
        : '—'

  const submitCourseReview = async () => {
    if (!user?.id || !courseId) return
    if (draftRating < 1 || draftRating > 5) {
      showError('Please choose a rating from 1 to 5 stars.')
      return
    }
    setSavingReview(true)
    try {
      const { data, error } = await createOrUpdateReview(courseId, user.id, {
        rating: draftRating,
        comment: draftComment.trim() || null,
      })
      if (error) {
        showError(typeof error === 'string' ? error : 'Could not save your review.')
        return
      }
      const wasEdit = Boolean(userReview)
      setUserReview(data)
      await refreshReviewsAndStats()
      success(wasEdit ? 'Review updated.' : 'Thanks for your review!')
    } catch {
      showError('Could not save your review.')
    } finally {
      setSavingReview(false)
    }
  }

  // Fetch lessons when component mounts
  useEffect(() => {
    loadCourseLessons()
  }, [courseId])

  // Load per-user progress map for this course
  useEffect(() => {
    if (user?.id && courseId) {
      fetchCourseProgress(user.id, courseId)
    }
  }, [user?.id, courseId, fetchCourseProgress])

  // Keep enrollment with progress_percentage fresh for accurate UI
  useEffect(() => {
    if (user?.id) {
      fetchEnrolledCourses(user.id)
    }
  }, [user?.id, fetchEnrolledCourses])

  useEffect(() => {
    // Fetch courses if not already loaded or if current course is not in store
    const courseInStore = courses?.find(c => c.id === courseId);
    if (!courses || courses.length === 0 || !courseInStore) {
      if (user?.id) {
        fetchCourses({}, user.id)
      } else {
        fetchCourses()
      }
    }
  }, [courses, courseId, fetchCourses, user?.id])

  // Reviews + aggregate stats: load with course so hero rating matches the Reviews tab
  useEffect(() => {
    if (!courseId) return
    let cancelled = false
    const load = async () => {
      setLoadingReviews(true)
      try {
        await refreshReviewsAndStats()
      } finally {
        if (!cancelled) setLoadingReviews(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [courseId, refreshReviewsAndStats])

  useEffect(() => {
    if (!user?.id || !courseId) {
      setUserReview(null)
      return
    }
    let cancelled = false
    getUserReview(courseId, user.id).then(({ data }) => {
      if (!cancelled) setUserReview(data)
    })
    return () => {
      cancelled = true
    }
  }, [user?.id, courseId, getUserReview])

  useEffect(() => {
    if (userReview) {
      setDraftRating(userReview.rating)
      setDraftComment(userReview.comment || '')
    } else {
      setDraftRating(0)
      setDraftComment('')
    }
  }, [userReview])

  // Handle course enrollment
  const handleEnroll = async () => {
    if (!courseId || typeof courseId !== 'string') {
      return;
    }
    if (!user) {
      navigate('/auth/login')
      return
    }

    if (isLocked) {
      navigate('/pricing')
      return
    }

    try {
      await enrollInCourse(user.id, courseId)
    } catch (error) {
      // Handle error silently or set error state if needed
    }
  }

  const toggleModule = (moduleId) => {
    setExpandedModule(expandedModule === moduleId ? null : moduleId)
  }

  const getProgressPercentage = () => {
    if (course?.progress_percentage !== undefined && course?.progress_percentage !== null) {
      return course.progress_percentage
    }
    const progressMap = courseProgress?.[courseId]
    if (!progressMap || lessons.length === 0) return 0
    const completedCount = Object.values(progressMap).filter(p => p.completed).length
    return Math.round((completedCount / lessons.length) * 100)
  }

  const getNextLessonId = () => {
    if (!lessons || lessons.length === 0) return null
    const progressMap = courseProgress?.[courseId] || {}
    const next = lessons.find(l => !progressMap[l.id]?.completed)
    return next ? next.id : lessons[0].id
  }

  const getTotalDurationMinutes = () => {
    const sumFromLessons = lessons && lessons.length > 0
      ? lessons.reduce((total, l) => total + (l?.duration_minutes || 0), 0)
      : 0
    if (sumFromLessons > 0) return sumFromLessons
    return (course?.duration_minutes || course?.duration || 0) || 0
  }

  const formatDuration = (totalMinutes) => {
    const minutes = Math.max(0, Math.floor(totalMinutes || 0))
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`
    if (hours > 0) return `${hours}h`
    return `${mins}m`
  }

  if (loading.courses) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-text-dark mb-4">Course Not Found</h2>
        <p className="text-text-light mb-6">The course you're looking for doesn't exist.</p>
        <Link to="/app/courses">
          <Button>Browse All Courses</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Hero Section with Cover Image */}
      <div className="relative text-white rounded-lg overflow-hidden">
        {course.thumbnail_url ? (
          <>
            <img
              src={course.thumbnail_url}
              alt={`${course.title} cover`}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-primary-dark to-primary-default" />
        )}
        <div className="relative p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm">
                {course.category?.name || 'General'}
              </span>
              <span className="text-white/80 text-sm">{course.level || course.difficulty_level || 'Beginner'}</span>
              {course.is_free_trial && (
                <span className="bg-green-500/80 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Free
                </span>
              )}
              {isLocked && (
                <span className="bg-amber-500/80 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Premium
                </span>
              )}
            </div>
            
            <PageTitle
              size="large"
              title={course.title}
              titleClassName="!text-white"
              subtitle={
                course.subtitle ||
                (course.description
                  ? `${String(course.description).substring(0, 100)}…`
                  : null)
              }
              subtitleWrapperClassName="pt-1 text-xl text-white/90 mb-6"
              className="space-y-1"
            />
            
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowShareModal(true)}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 fill-amber-400 text-amber-300" />
                <span className="font-medium">{heroRatingDisplay}</span>
                <span className="text-white/80">
                  ({heroRatingCount.toLocaleString()}{' '}
                  {heroRatingCount === 1 ? 'rating' : 'ratings'})
                </span>
              </div>

              {/* Enrollment progress bar */}
              {isEnrolled && (
                <div className="mt-2 text-left">
                  <div className="flex items-center justify-between text-sm text-text-muted mb-1">
                    <span>Progress</span>
                    <span>{getProgressPercentage()}%</span>
                  </div>
                  <div className="w-full bg-background-medium rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-primary-default"
                      style={{ width: `${getProgressPercentage()}%` }}
                    ></div>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{(course.students || 0).toLocaleString()} students</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{formatDuration(getTotalDurationMinutes())}</span>
              </div>
              {/* Modules and Lessons counts */}
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                <span>{modules?.length || 0} modules</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span>{lessons?.length || 0} lessons</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span>{course.language || 'English'}</span>
              </div>
            </div>
          </div>

          {/* Enrollment Card */}
          <div className="lg:col-span-1">
            <Card className="p-6 bg-white text-text-dark">
              <div className="text-center mb-8">
              
                
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-2xl font-bold">${course.price || 'Free'}</span>
                  {course.originalPrice && (
                    <span className="text-lg text-text-muted line-through">${course.originalPrice}</span>
                  )}
                </div>
                
                {course.originalPrice && (
                  <span className="text-success-default font-medium">
                    {Math.round(((course.originalPrice - (course.price || 0)) / course.originalPrice) * 100)}% off
                  </span>
                )}
              </div>

              {isLocked ? (
                <div className="space-y-3">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <p className="text-sm font-semibold text-amber-900">
                        Paid Plan Required
                      </p>
                    </div>
                    <p className="text-sm text-amber-800">
                      This course is available to paid subscribers. Sign up for a paid package 
                      to unlock this course and the full catalog with quizzes and certificates.
                    </p>
                  </div>
                  <Button
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                    size="lg"
                    onClick={() => navigate('/pricing')}
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    View Paid Plans
                  </Button>
                  <Button variant="ghost" className="w-full">
                    <Heart className="w-4 h-4 mr-2" />
                    Add to Wishlist
                  </Button>
                </div>
              ) : isEnrolled ? (
                (() => {
                  const progressPct = getProgressPercentage();
                  const hasStarted = progressPct > 0 || !!course?.last_accessed;
                  const nextLessonId = getNextLessonId();
                  const isCompleted = progressPct >= 100;
                  
                  return (
                    <div className="space-y-3">
                      {isCompleted ? (
                        <>
                          <Link to={`/app/courses/${courseId}/lesson/${lessons[0]?.id || nextLessonId}`}>
                            <Button className="w-full" size="lg">
                              <BookOpen className="w-4 h-4 mr-2" />
                              Review Course
                            </Button>
                          </Link>
                          {canAccessCertificates(course) ? (
                            <Link to={`/app/courses/${courseId}/completion`}>
                              <Button variant="secondary" className="w-full" size="lg">
                                <Award className="w-4 h-4 mr-2" />
                                View Certificate
                              </Button>
                            </Link>
                          ) : (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
                              <p className="text-sm text-amber-800">
                                Certificates are available with a paid plan.
                              </p>
                            </div>
                          )}
                        </>
                      ) : hasStarted && nextLessonId ? (
                        <Link to={`/app/courses/${courseId}/lesson/${nextLessonId}`}>
                          <Button className="w-full" size="lg">
                            <BookOpen className="w-4 h-4 mr-2" />
                            Continue Learning ({progressPct}%)
                          </Button>
                        </Link>
                      ) : nextLessonId ? (
                        <Link to={`/app/courses/${courseId}/lesson/${nextLessonId}`}>
                          <Button className="w-full" size="lg">
                            <Play className="w-5 h-5 mr-2" />
                            Start Learning
                          </Button>
                        </Link>
                      ) : (
                        <Button className="w-full" size="lg" disabled>
                          <Play className="w-5 h-5 mr-2" />
                          {lessons.length === 0 ? 'Loading...' : 'No Lessons Available'}
                        </Button>
                      )}
                      <div className="text-center text-sm text-success-default">
                        ✓ You're enrolled in this course
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="space-y-3">
                  <Button className="w-full" size="lg" onClick={handleEnroll}>
                    Enroll Now
                  </Button>
                  <Button variant="ghost" className="w-full">
                    <Heart className="w-4 h-4 mr-2" />
                    Add to Wishlist
                  </Button>
                </div>
              )}

              {/* Course Editor Button - Show for course creators */}
              {/* {course?.created_by === user?.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <Link to={`/app/editor/${courseId}`}>
                    <Button variant="outline" className="w-full">
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit Course Content
                    </Button>
                  </Link>
                </div>
              )} */}

              <div className="mt-6 space-y-2 text-sm text-text-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success-default" />
                  <span>30-day money-back guarantee</span>
                </div>
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-success-default" />
                  <span>Mobile and TV access</span>
                </div>
                {canAccessCertificates(course) && (
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-success-default" />
                    <span>Certificate of completion</span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
      </div>

      {/* Upgrade Banner for locked courses */}
      {isLocked && <UpgradeBanner />}

      {/* Navigation Tabs */}
      <div className="border-b border-background-dark">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'curriculum', label: 'Curriculum' },
            { id: 'instructor', label: 'Instructor' },
            { id: 'reviews', label: 'Reviews' },
            { id: 'community', label: 'Community' },
            { id: 'resources', label: 'Resources' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-default text-primary-default'
                  : 'border-transparent text-text-light hover:text-text-medium'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Description */}
              <Card className="p-6">
                <h2 className="text-2xl font-bold text-text-dark mb-4">About This Course</h2>
                <div className="prose max-w-none text-text-medium">
                  {course.description ? (
                    course.description.split('\n\n').map((paragraph, index) => (
                      <p key={index} className="mb-4">{paragraph}</p>
                    ))
                  ) : (
                    <p>No description available for this course.</p>
                  )}
                </div>
              </Card>

              {/* What You'll Learn */}
              <Card className="p-6">
                <h2 className="text-2xl font-bold text-text-dark mb-4">What You'll Learn</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {course.outcomes ? (
                    course.outcomes.map((outcome, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-success-default flex-shrink-0 mt-0.5" />
                        <span className="text-text-dark">{outcome}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-text-medium">Learning objectives not specified for this course.</p>
                  )}
                </div>
              </Card>

              {/* Requirements */}
              <Card className="p-6">
                <h2 className="text-2xl font-bold text-text-dark mb-4">Requirements</h2>
                <ul className="space-y-2">
                  {course.requirements ? (
                    course.requirements.map((requirement, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-text-muted rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-text-medium">{requirement}</span>
                      </li>
                    ))
                  ) : (
                    <p className="text-text-medium">No specific requirements listed for this course.</p>
                  )}
                </ul>
              </Card>
            </div>
          )}

          {activeTab === 'curriculum' && (
            <Card className="p-6">
              <h2 className="text-2xl font-bold text-text-dark mb-6">Course Curriculum</h2>
              <div className="space-y-4">
                {modules && modules.length > 0 ? (
                  modules.map((module) => (
                    <div key={module.id} className="border border-background-dark rounded-lg">
                      <button
                        onClick={() => setExpandedModule(expandedModule === module.id ? null : module.id)}
                        className="w-full flex items-center justify-between p-4 hover:bg-background-light transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {expandedModule === module.id ? (
                            <ChevronDown className="w-5 h-5 text-text-medium" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-text-medium" />
                          )}
                          <div className="text-left">
                            <h3 className="font-semibold text-text-dark">{module.title}</h3>
                            <p className="text-sm text-text-light">
                              {(() => {
                                const lessonList = courseStructure[module.id]?.lessons || [];
                                const lessonCount = lessonList.length;
                                const totalMins = lessonList.reduce((sum, l) => sum + (l?.duration_minutes || 0), 0);
                                return `${lessonCount} lessons • ${totalMins} min`;
                              })()}
                            </p>
                          </div>
                        </div>
                      </button>

                      {expandedModule === module.id && (
                        <div className="border-t border-background-dark">
                          {courseStructure[module.id]?.lessons?.map((lesson, index) => (
                            <div key={lesson.id} className="flex items-center justify-between p-4 hover:bg-background-light">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-background-medium rounded flex items-center justify-center">
                                  {lesson.content_type === 'video' ? (
                                    <Play className="w-4 h-4 text-text-muted" />
                                  ) : (
                                    <BookOpen className="w-4 h-4 text-text-muted" />
                                  )}
                                </div>
                                <div>
                                  <h4 className="font-medium text-text-dark">{lesson.title}</h4>
                                  <p className="text-sm text-text-light">{lesson.duration_minutes || 0} min</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {isEnrolled && (
                                  <Link to={`/app/courses/${courseId}/lesson/${lesson.id}`}>
                                    <Button size="sm" variant="ghost">
                                      <Play className="w-4 h-4" />
                                    </Button>
                                  </Link>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : lessons && lessons.length > 0 ? (
                  // Fallback: show lessons without modules if no modules exist
                  <div className="space-y-2">
                    {lessons.map((lesson) => (
                      <div key={lesson.id} className="flex items-center justify-between p-4 border border-background-dark rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-background-medium rounded flex items-center justify-center">
                            {lesson.content_type === 'video' ? (
                              <Play className="w-4 h-4 text-text-muted" />
                            ) : (
                              <BookOpen className="w-4 h-4 text-text-muted" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium text-text-dark">{lesson.title}</h4>
                            <p className="text-sm text-text-light">{lesson.duration_minutes || 0} min</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {isEnrolled && (
                            <Link to={`/app/courses/${courseId}/lesson/${lesson.id}`}>
                              <Button size="sm" variant="ghost">
                                <Play className="w-4 h-4" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-text-medium">No curriculum available for this course.</p>
                )}
              </div>
            </Card>
          )}

          {activeTab === 'instructor' && (
            <Card className="p-6">
              <h2 className="text-2xl font-bold text-text-dark mb-6">Instructor</h2>
              {course.instructor ? (
                <div className="flex items-start gap-6">
                  <div className="text-6xl">{course.instructor.avatar}</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-text-dark mb-2">{course.instructor.name}</h3>
                    <p className="text-text-medium mb-4">{course.instructor.title}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-text-dark">{course.instructor.rating}</div>
                        <div className="text-sm text-text-light">Instructor Rating</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-text-dark">{course.instructor.students.toLocaleString()}</div>
                        <div className="text-sm text-text-light">Students</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-text-dark">{course.instructor.courses}</div>
                        <div className="text-sm text-text-light">Courses</div>
                      </div>
                    </div>
                    
                    <p className="text-text-medium">{course.instructor.bio}</p>
                  </div>
                </div>
              ) : (
                <p className="text-text-medium">No instructor information available for this course.</p>
              )}
            </Card>
          )}

          {activeTab === 'reviews' && (
            <Card className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-text-dark">Student Reviews</h2>
                  <p className="text-sm text-text-light mt-1">
                    See what learners thought and share your own experience.
                  </p>
                </div>
                {isEnrolled && user && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0"
                    onClick={() =>
                      document.getElementById('course-review-form')?.scrollIntoView({ behavior: 'smooth' })
                    }
                  >
                    {userReview ? 'Edit your review' : 'Write a review'}
                  </Button>
                )}
              </div>

              {loadingReviews ? (
                <div className="flex justify-center items-center py-12">
                  <LoadingSpinner />
                </div>
              ) : (
                <>
                  {ratingStats && ratingStats.totalReviews > 0 ? (
                    <div className="grid gap-8 md:grid-cols-[minmax(0,220px)_1fr] mb-10">
                      <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-background-light px-6 py-8 text-center md:items-start md:text-left">
                        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                          Average
                        </p>
                        <p className="text-5xl font-bold text-text-dark tabular-nums">
                          {ratingStats.averageRating.toFixed(1)}
                        </p>
                        <AverageStarRow
                          average={ratingStats.averageRating}
                          sizeClass="w-6 h-6"
                          className="justify-center md:justify-start"
                        />
                        <p className="text-sm text-text-medium">
                          Based on{' '}
                          <span className="font-semibold text-text-dark">
                            {ratingStats.totalReviews.toLocaleString()}
                          </span>{' '}
                          review{ratingStats.totalReviews !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text-dark mb-3">Rating breakdown</p>
                        <div className="space-y-2.5">
                          {[5, 4, 3, 2, 1].map((rating) => {
                            const count = ratingStats.ratingDistribution[rating] || 0
                            const percentage =
                              ratingStats.totalReviews > 0
                                ? (count / ratingStats.totalReviews) * 100
                                : 0
                            const showBar = count > 0
                            return (
                              <div key={rating} className="flex items-center gap-3">
                                <div className="flex w-14 shrink-0 items-center justify-end gap-1 text-sm text-text-dark tabular-nums">
                                  <span>{rating}</span>
                                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
                                </div>
                                <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-background-medium">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      showBar
                                        ? 'bg-[var(--color-warning)]'
                                        : 'bg-transparent'
                                    }`}
                                    style={{
                                      width: showBar ? `${Math.max(percentage, 8)}%` : '0%',
                                    }}
                                    title={`${count} review${count !== 1 ? 's' : ''}`}
                                  />
                                </div>
                                <span className="w-8 shrink-0 text-right text-sm tabular-nums text-text-medium">
                                  {count}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-10 rounded-xl border border-dashed border-border bg-background-light px-6 py-10 text-center">
                      <Star className="w-10 h-10 mx-auto mb-3 text-amber-400 fill-amber-300/40" />
                      <p className="font-semibold text-text-dark mb-1">No reviews yet</p>
                      <p className="text-sm text-text-light max-w-md mx-auto">
                        {isEnrolled && user
                          ? 'Be the first to leave a rating and help others choose this course.'
                          : 'Enrol in this course to leave a review.'}
                      </p>
                    </div>
                  )}

                  {isEnrolled && user && (
                    <div
                      id="course-review-form"
                      className="mb-10 scroll-mt-24 rounded-xl border border-border bg-background-white shadow-sm p-6"
                    >
                      <h3 className="text-lg font-semibold text-text-dark mb-1">
                        {userReview ? 'Your review' : 'Write a review'}
                      </h3>
                      <p className="text-sm text-text-light mb-4">
                        {userReview
                          ? 'Update your rating or comment any time.'
                          : 'Tap the stars to rate this course, then add an optional comment.'}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        <span className="text-sm text-text-medium mr-2">Your rating</span>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            className="p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30"
                            aria-label={`Rate ${star} out of 5`}
                            onClick={() => setDraftRating(star)}
                          >
                            <Star
                              className={`w-8 h-8 ${
                                star <= draftRating
                                  ? 'fill-amber-400 text-amber-500'
                                  : 'fill-transparent text-text-muted'
                              }`}
                              strokeWidth={star <= draftRating ? 0 : 1.35}
                            />
                          </button>
                        ))}
                        {draftRating > 0 && (
                          <span className="text-sm text-text-medium tabular-nums">{draftRating} / 5</span>
                        )}
                      </div>
                      <label className="block text-sm font-medium text-text-dark mb-2" htmlFor="course-review-comment">
                        Comment (optional)
                      </label>
                      <textarea
                        id="course-review-comment"
                        rows={4}
                        className="w-full rounded-lg border border-background-dark px-3 py-2 text-text-dark placeholder-text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
                        placeholder="What did you like? What could be better?"
                        value={draftComment}
                        onChange={(e) => setDraftComment(e.target.value)}
                      />
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Button
                          type="button"
                          onClick={submitCourseReview}
                          disabled={savingReview || draftRating < 1}
                        >
                          {savingReview ? 'Saving…' : userReview ? 'Update review' : 'Post review'}
                        </Button>
                        {userReview && (
                          <p className="text-xs text-text-light self-center">
                            Posted {new Date(userReview.created_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {reviews.length > 0 ? (
                    <div className="space-y-6">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                        All reviews
                      </h3>
                      {reviews.map((review) => {
                        const userName = review.user
                          ? `${review.user.first_name || ''} ${review.user.last_name || ''}`.trim() ||
                            'Anonymous'
                          : 'Anonymous'
                        const userAvatar = review.user?.avatar_url ? (
                          <img
                            src={review.user.avatar_url}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light text-sm font-semibold text-primary-default">
                            {userName.charAt(0).toUpperCase()}
                          </div>
                        )

                        return (
                          <article
                            key={review.id}
                            className="border-b border-background-light pb-6 last:border-b-0"
                          >
                            <div className="flex items-start gap-4">
                              {userAvatar}
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                                  <h4 className="font-medium text-text-dark">{userName}</h4>
                                  <AverageStarRow average={review.rating} sizeClass="w-4 h-4" />
                                  <time
                                    className="text-sm text-text-light"
                                    dateTime={review.created_at}
                                  >
                                    {new Date(review.created_at).toLocaleDateString()}
                                  </time>
                                </div>
                                {review.comment ? (
                                  <p className="text-text-medium whitespace-pre-wrap">{review.comment}</p>
                                ) : (
                                  <p className="text-sm italic text-text-muted">No written comment</p>
                                )}
                              </div>
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  ) : (
                    !isEnrolled && (
                      <p className="py-6 text-center text-text-medium">No reviews yet.</p>
                    )
                  )}
                </>
              )}
            </Card>
          )}

          {activeTab === 'community' && (
            <CourseDiscussionPanel
              courseId={courseId}
              userId={user?.id}
              isEnrolled={isEnrolled}
            />
          )}

          {activeTab === 'resources' && (
            <Card className="p-6">
              <h2 className="text-2xl font-bold text-text-dark mb-6">Course Resources</h2>
              {course?.resources && Array.isArray(course.resources) && course.resources.length > 0 ? (
                <div className="space-y-3">
                  {course.resources.map((resource) => (
                    resource.type === 'link' ? (
                      <a
                        key={resource.id}
                        href={normalizeUrl(resource.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-start p-4 border border-background-dark rounded-lg hover:bg-background-light cursor-pointer no-underline"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <ExternalLink className="w-5 h-5 text-blue-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-text-dark truncate">{resource.title}</h4>
                            {resource.description && (
                              <p className="text-sm text-text-light truncate">{resource.description}</p>
                            )}
                          </div>
                        </div>
                      </a>
                    ) : (
                      <div 
                        key={resource.id} 
                        onClick={() => window.open(resource.url, '_blank', 'noopener,noreferrer')}
                        className="flex items-center justify-between p-4 border border-background-dark rounded-lg hover:bg-background-light cursor-pointer"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <File className="w-5 h-5 text-text-muted flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-text-dark truncate">{resource.title}</h4>
                            {resource.description && (
                              <p className="text-sm text-text-light truncate">{resource.description}</p>
                            )}
                            {resource.file_size && (
                              <p className="text-xs text-text-muted">
                                {resource.file_size < 1024 
                                  ? `${resource.file_size} B`
                                  : resource.file_size < 1024 * 1024
                                  ? `${(resource.file_size / 1024).toFixed(2)} KB`
                                  : `${(resource.file_size / (1024 * 1024)).toFixed(2)} MB`}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadFile(resource.url, resource.file_name || resource.title);
                          }}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    )
                  ))}
                </div>
              ) : (
                <p className="text-text-medium">No resources available for this course yet.</p>
              )}
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Course Features */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-text-dark mb-4">This course includes:</h3>
            <div className="space-y-3">
              {course.features ? (
                course.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-success-default flex-shrink-0" />
                    <span className="text-text-dark text-sm">{feature}</span>
                  </div>
                ))
              ) : (
                <p className="text-text-medium text-sm">Course features not specified.</p>
              )}
            </div>
          </Card>

          {/* Share Course */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-text-dark mb-4">Share this course</h3>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex-1"
                onClick={() => setShowShareModal(true)}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </Card>

          {/* Share Course Modal */}
          <ShareCourseModal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            course={course}
          />
        </div>
      </div>
    </div>
  )
}



// src/pages/courses/CourseCompletion.jsx
import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  Award, 
  Download, 
  Share2, 
  Star,
  Clock,
  BookOpen,
  ArrowRight,
  CheckCircle,
  Trophy,
  Target,
  Calendar,
  ExternalLink,
  File
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useToast } from '@/components/ui'
import { useCourseStore } from '@/store/courseStore'
import { useAuth } from '@/hooks/auth/useAuth'
import CertificatePreviewModal from '@/components/course/CertificatePreviewModal'
import {
  revokeObjectURL,
  handleCertificateError,
  downloadBlob,
  buildCertificateShareLink,
} from '@/utils/certificateUtils'

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

export default function CourseCompletion() {
  const { courseId } = useParams()
  const { user } = useAuth()
  const { success, error: showError } = useToast()
  const courses = useCourseStore(state => state.courses)
  const actions = useCourseStore(state => state.actions)
  const [course, setCourse] = useState(null)
  const [completionData, setCompletionData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showConfetti, setShowConfetti] = useState(false)
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState('')
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [submittingReview, setSubmittingReview] = useState(false)
  const [userReview, setUserReview] = useState(null)
  const [recommendedCourses, setRecommendedCourses] = useState([])
  const [showCertificateModal, setShowCertificateModal] = useState(false)
  const [certificateInlinePreviewUrl, setCertificateInlinePreviewUrl] = useState(null)
  const [certificateInlinePreviewLoading, setCertificateInlinePreviewLoading] = useState(false)
  const certificateInlinePreviewRef = useRef(null)


  // recommendedCourses are computed from actual courses
  useEffect(() => {
    const loadData = async () => {
      try {
        // Ensure course is available
        let found = courses.find(c => c.id === courseId)
        if (!found) {
          const { data } = await actions.fetchCourses()
          found = (data || []).find(c => c.id === courseId) || null
        }
        setCourse(found)

        if (!user?.id || !courseId) {
          setCompletionData(null)
          setLoading(false)
          return
        }

        // Fetch lessons, progress, and quiz data
        const [{ data: groupedLessons }, { data: progressMap }, { data: courseQuizzes }] = await Promise.all([
          actions.fetchCourseLessons(courseId),
          actions.fetchCourseProgress(user.id, courseId),
          actions.fetchQuizzes(courseId),
        ])

        // Flatten lessons for counts
        let totalLessons = 0
        if (groupedLessons && typeof groupedLessons === 'object') {
          Object.values(groupedLessons).forEach(moduleData => {
            if (moduleData && Array.isArray(moduleData.lessons)) totalLessons += moduleData.lessons.length
          })
        }

        // Compute completion stats from progress
        const progressValues = progressMap ? Object.values(progressMap) : []
        const completedItems = progressValues.filter(p => p.completed)
        const lessonsCompleted = completedItems.length
        const totalTimeSpent = progressValues.reduce((sum, p) => sum + (p?.metadata?.timeSpent || 0), 0)
        const latestCompletedAt = completedItems.reduce((latest, p) => {
          const ct = p?.completed_at ? new Date(p.completed_at).getTime() : 0
          return ct > latest ? ct : latest
        }, 0)

        // Calculate quiz completion stats and average score
        let quizzesPassed = 0
        let totalQuizzes = 0
        let totalScore = 0
        let scoreCount = 0

        if (courseQuizzes && courseQuizzes.length > 0) {
          totalQuizzes = courseQuizzes.length

          // Fetch quiz attempts for all quizzes
          const quizAttemptsPromises = courseQuizzes.map(quiz =>
            actions.fetchQuizAttempts(user.id, quiz.id)
          )

          try {
            const quizAttemptsResults = await Promise.all(quizAttemptsPromises)

            courseQuizzes.forEach((quiz, index) => {
              const attempts = quizAttemptsResults[index]?.data || []
              if (attempts.length > 0) {
                // Find the most recent attempt
                const latestAttempt = attempts.sort((a, b) =>
                  new Date(b.completed_at) - new Date(a.completed_at)
                )[0]

                if (latestAttempt.passed) {
                  quizzesPassed++
                }

                // Add to average score calculation
                if (latestAttempt.score !== null && latestAttempt.score !== undefined) {
                  totalScore += latestAttempt.score
                  scoreCount++
                }
              }
            })
          } catch (error) {
            console.warn('Error fetching quiz attempts:', error)
          }
        }

        // Calculate final score (average of all quiz scores)
        const finalScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : null;

        // Generate badges based on real achievements
        const badges = [];

        if (totalLessons > 0 && lessonsCompleted === totalLessons) {
          badges.push({
            id: 1,
            name: 'Course Master',
            icon: '🎓',
            description: 'Completed all lessons'
          });
        }

        if (quizzesPassed === totalQuizzes && totalQuizzes > 0) {
          badges.push({
            id: 2,
            name: 'Quiz Champion',
            icon: '🏆',
            description: 'Passed all quizzes'
          });
        }

        if (finalScore && finalScore >= 90) {
          badges.push({
            id: 3,
            name: 'Top Performer',
            icon: '⭐',
            description: 'Achieved 90%+ average score'
          });
        }

        if (totalTimeSpent > 0 && totalLessons > 0) {
          const avgTimePerLesson = totalTimeSpent / lessonsCompleted;
          const expectedTimePerLesson = (found?.duration_minutes || 60) / totalLessons;

          if (avgTimePerLesson < expectedTimePerLesson * 0.8) {
            badges.push({
              id: 4,
              name: 'Quick Learner',
              icon: '⚡',
              description: 'Completed course efficiently'
            });
          }
        }

        // Generate skills from course category and performance
        const skills = [];

        if (found?.category) {
          const categoryName = typeof found.category === 'string' ? found.category : found.category.name;
          let level = 'Beginner';

          if (finalScore >= 90) {
            level = 'Advanced';
          } else if (finalScore >= 75) {
            level = 'Intermediate';
          } else if (lessonsCompleted === totalLessons) {
            level = 'Intermediate';
          }

          skills.push({
            name: categoryName,
            level: level
          });
        }

        // Add general skills based on completion
        if (lessonsCompleted === totalLessons && totalQuizzes > 0 && quizzesPassed === totalQuizzes) {
          skills.push({
            name: 'Problem Solving',
            level: finalScore >= 85 ? 'Advanced' : 'Intermediate'
          });
        }

        if (totalTimeSpent > 180) { // More than 3 hours
          skills.push({
            name: 'Continuous Learning',
            level: 'Advanced'
          });
        }

        const computed = {
          completedAt: latestCompletedAt ? new Date(latestCompletedAt).toISOString() : null,
          totalTimeSpent,
          finalScore,
          lessonsCompleted,
          totalLessons,
          quizzesPassed,
          totalQuizzes,
          quizCompletionPercentage: totalQuizzes > 0 ? Math.round((quizzesPassed / totalQuizzes) * 100) : 0,
          projectsCompleted: 0, // Projects are not tracked in current database schema
          certificate: null,
          badges,
          skills,
        }

        setCompletionData(computed)

        // Show confetti only if all lessons are completed
        if (totalLessons > 0 && lessonsCompleted === totalLessons) {
          setShowConfetti(true)
          setTimeout(() => setShowConfetti(false), 3000)
          // Ensure certificate exists (before marking page ready so inline preview can load the real template)
          const { data: existingCert } = await actions.getCertificateForCourse(user.id, courseId)
          if (!existingCert) {
            const { data: templates } = await actions.fetchCertificateTemplates()
            const defaultTemplate = templates?.find((t) => t.is_default) || templates?.[0]

            if (defaultTemplate) {
              await actions.generateCertificateFromTemplate(user.id, courseId, defaultTemplate.id)
            } else {
              await actions.createCertificate(user.id, courseId)
            }
          }
        }

        setLoading(false)

        // Compute recommended courses from actual data (prefer same category)
        try {
          let allCourses = courses
          if (!allCourses || allCourses.length === 0) {
            const { data: fetched } = await actions.fetchCourses()
            allCourses = fetched || []
          }
          const others = (allCourses || []).filter(c => c.id !== courseId)
          let rec = others
          const foundCategoryId = found?.category?.id
          if (foundCategoryId) {
            const sameCat = others.filter(c => c.category?.id === foundCategoryId)
            if (sameCat.length > 0) rec = sameCat
          }
          setRecommendedCourses(rec.slice(0, 3))
        } catch {
          setRecommendedCourses([])
        }

        // Fetch user's existing review if any
        if (user?.id) {
          const { data: existingReview } = await actions.getUserReview(courseId, user.id)
          if (existingReview) {
            setUserReview(existingReview)
            setRating(existingReview.rating)
            setReview(existingReview.comment || '')
          }
        }
      } catch {
        setLoading(false)
      }
    }
    loadData()
  }, [courseId, user?.id, courses, actions])

  // Inline certificate preview: same pipeline as CertificatePreviewModal (DB template + certificate_data)
  useEffect(() => {
    let cancelled = false

    const loadInlinePreview = async () => {
      if (!user?.id || !courseId || !completionData) {
        setCertificateInlinePreviewLoading(false)
        return
      }
      const { lessonsCompleted, totalLessons } = completionData
      if (totalLessons <= 0 || lessonsCompleted < totalLessons) {
        setCertificateInlinePreviewUrl(null)
        setCertificateInlinePreviewLoading(false)
        return
      }

      setCertificateInlinePreviewLoading(true)
      try {
        const { data: cert } = await actions.getCertificateForCourse(user.id, courseId)
        if (!cert) {
          if (!cancelled) {
            setCertificateInlinePreviewUrl(null)
          }
          return
        }

        const { url } = await actions.generateCertificatePreview(cert.id)
        if (cancelled) {
          revokeObjectURL(url)
          return
        }
        if (certificateInlinePreviewRef.current) {
          revokeObjectURL(certificateInlinePreviewRef.current)
        }
        certificateInlinePreviewRef.current = url
        setCertificateInlinePreviewUrl(url)
      } catch {
        if (!cancelled) {
          setCertificateInlinePreviewUrl(null)
        }
      } finally {
        if (!cancelled) {
          setCertificateInlinePreviewLoading(false)
        }
      }
    }

    if (!loading) {
      loadInlinePreview()
    }

    return () => {
      cancelled = true
      if (certificateInlinePreviewRef.current) {
        revokeObjectURL(certificateInlinePreviewRef.current)
        certificateInlinePreviewRef.current = null
      }
    }
  }, [loading, user?.id, courseId, completionData, actions])

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const handleDownloadCertificate = async () => {
    if (!user?.id || !courseId) {
      showError('You must be logged in to download your certificate.')
      return
    }
    try {
      const { data: userCertificate } = await actions.getCertificateForCourse(user.id, courseId)
      if (!userCertificate) {
        showError('No certificate found yet. If you just finished the course, try refreshing the page.')
        return
      }
      const { blob, filename } = await actions.generateCertificatePreview(userCertificate.id)
      downloadBlob(blob, filename)
      success('Certificate download started.')
    } catch (err) {
      showError(handleCertificateError(err, 'download certificate'))
    }
  }

  const handleShareCertificate = async () => {
    if (!user?.id || !courseId) {
      showError('You must be signed in to share your certificate.')
      return
    }
    try {
      const { data: cert } = await actions.getCertificateForCourse(user.id, courseId)
      if (!cert) {
        showError('Certificate not found. Finish the course or refresh the page.')
        return
      }
      const { data: token, error: mintError } = await actions.mintCertificateShareToken(cert.id)
      if (!token) {
        showError(
          mintError
            ? handleCertificateError(mintError, 'create share link')
            : 'Could not create a share link. Confirm the latest Supabase migrations are applied.'
        )
        return
      }
      const shareUrl = buildCertificateShareLink(token)
      if (!shareUrl) {
        showError('Could not build a valid share URL.')
        return
      }
      const title = `Certificate: ${course?.title || 'a course'}`
      if (navigator.share) {
        try {
          const payload = { title, url: shareUrl }
          if (!navigator.canShare || navigator.canShare(payload)) {
            await navigator.share(payload)
            success('Shared successfully.')
          } else {
            await navigator.clipboard.writeText(shareUrl)
            success('Certificate link copied. Anyone with the link can view your certificate.')
          }
        } catch {
          /* user cancelled */
        }
      } else {
        try {
          await navigator.clipboard.writeText(shareUrl)
          success('Certificate link copied. Anyone with the link can view your certificate.')
        } catch {
          showError('Could not copy the link.')
        }
      }
    } catch (err) {
      showError(handleCertificateError(err, 'share certificate'))
    }
  }

  const submitReview = async () => {
    if (rating === 0) {
      showError('Please select a rating')
      return
    }

    if (!user?.id || !courseId) {
      showError('You must be logged in to submit a review')
      return
    }

    setSubmittingReview(true)

    try {
      const result = await actions.createOrUpdateReview(courseId, user.id, {
        rating,
        comment: review.trim() || null
      })

      if (result.error) {
        showError(result.error)
        return
      }

      setUserReview(result.data)
      setShowReviewForm(false)
      success('Thank you for your review!')
    } catch (err) {
      showError(err.message || 'Failed to submit review')
    } finally {
      setSubmittingReview(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-8xl mx-auto space-y-8">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-transparent">
            {/* Simple confetti simulation */}
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-primary-default rounded-full animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Certificate Section */}
      <Card className="p-8">
        <div className="text-center mb-6" >
          <Trophy className="w-16 h-16 text-warning-default mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-text-dark mb-2">Congratulations!</h2>
          <p className="text-text-light">
            Download your certificate and share your achievement with the world.
          </p>
          
        </div>

        {completionData.totalLessons > 0 &&
        completionData.lessonsCompleted >= completionData.totalLessons ? (
          <div className="max-w-3xl mx-auto mb-6">
            {certificateInlinePreviewLoading ? (
              <div className="flex flex-col items-center justify-center min-h-[280px] rounded-xl border border-border bg-background-light">
                <LoadingSpinner size="lg" />
                <p className="mt-4 text-sm text-text-light">Loading certificate preview…</p>
              </div>
            ) : certificateInlinePreviewUrl ? (
              <div className="rounded-xl border border-border bg-background-white shadow-md overflow-hidden">
                <img
                  src={certificateInlinePreviewUrl}
                  alt={`Certificate for ${course?.title || 'course'}`}
                  className="w-full h-auto object-contain max-h-[min(70vh,520px)] mx-auto block bg-background-medium"
                />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-background-light px-6 py-10 text-center">
                <p className="text-text-medium mb-4">
                  Certificate preview is not available. Open the full certificate to view or download it.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-md mx-auto rounded-lg border border-dashed border-border bg-background-light p-8 mb-6 text-center text-text-medium">
            Complete all lessons to generate your certificate using the default template from Certificate Management.
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
          <Button onClick={() => setShowCertificateModal(true)} size="lg">
            <Award className="w-5 h-5 mr-2" />
            View Certificate
          </Button>
          <Button variant="secondary" onClick={handleShareCertificate} size="lg">
            <Share2 className="w-5 h-5 mr-2" />
            Share Certificate
          </Button>
          <Button variant="secondary" onClick={handleDownloadCertificate} size="lg">
            <Download className="w-5 h-5 mr-2" />
            Download
          </Button>
        </div>
      </Card>

      {/* Achievement Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Badges Earned */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold text-text-dark mb-4">Badges Earned</h3>
          <div className="space-y-4">
            {Array.isArray(completionData.badges) && completionData.badges.map((badge) => (
              <div key={badge.id} className="flex items-center gap-4 p-3 bg-background-light rounded-lg">
                <div className="text-2xl">{badge.icon}</div>
                <div>
                  <h4 className="font-semibold text-text-dark">{badge.name}</h4>
                  <p className="text-sm text-text-light">{badge.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Skills Acquired */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold text-text-dark mb-4">Skills Acquired</h3>
          <div className="space-y-3">
            {Array.isArray(completionData.skills) && completionData.skills.map((skill, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-text-dark">{skill.name}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  skill.level === 'Advanced' ? 'bg-success-light text-success-default' :
                  skill.level === 'Intermediate' ? 'bg-warning-light text-warning-default' :
                  'bg-primary-light text-primary-default'
                }`}>
                  {skill.level}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Course Statistics */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold text-text-dark mb-6">Your Learning Journey</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-success-light rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-8 h-8 text-success-default" />
            </div>
            <div className="text-2xl font-bold text-text-dark">{completionData.lessonsCompleted}</div>
            <div className="text-sm text-text-light">Lessons Completed</div>
          </div>
          
          {completionData.totalQuizzes > 0 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-3">
                <Target className="w-8 h-8 text-primary-default" />
              </div>
              <div className="text-2xl font-bold text-text-dark">{completionData.quizzesPassed}/{completionData.totalQuizzes}</div>
              <div className="text-sm text-text-light">Quizzes Passed</div>
            </div>
          )}

          {completionData.finalScore !== null && (
            <div className="text-center">
              <div className="w-16 h-16 bg-success-light rounded-full flex items-center justify-center mx-auto mb-3">
                <Star className="w-8 h-8 text-success-default" />
              </div>
              <div className="text-2xl font-bold text-text-dark">{completionData.finalScore}%</div>
              <div className="text-sm text-text-light">Average Score</div>
            </div>
          )}

          <div className="text-center">
            <div className="w-16 h-16 bg-error-light rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock className="w-8 h-8 text-error-default" />
            </div>
            <div className="text-2xl font-bold text-text-dark">{formatTime(completionData.totalTimeSpent)}</div>
            <div className="text-sm text-text-light">Time Invested</div>
          </div>
        </div>
      </Card>

      {/* Course Review */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold text-text-dark mb-4">Rate This Course</h3>
        {userReview && !showReviewForm ? (
          <div className="max-w-md mx-auto">
            <div className="text-center mb-4">
              <p className="text-text-light mb-4">Your Review</p>
              <div className="flex justify-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-6 h-6 ${
                      star <= userReview.rating
                        ? 'fill-warning-default text-warning-default'
                        : 'text-background-dark'
                    }`}
                  />
                ))}
              </div>
              {userReview.comment && (
                <p className="text-text-medium mt-4">{userReview.comment}</p>
              )}
            </div>
            <div className="flex justify-center">
              <Button variant="secondary" onClick={() => setShowReviewForm(true)}>
                Edit Review
              </Button>
            </div>
          </div>
        ) : !showReviewForm ? (
          <div className="text-center">
            <p className="text-text-light mb-4">
              Help other students by sharing your experience with this course.
            </p>
            <Button onClick={() => setShowReviewForm(true)}>
              <Star className="w-4 h-4 mr-2" />
              Leave a Review
            </Button>
          </div>
        ) : (
          <div className="max-w-md mx-auto">
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-dark mb-2">
                Your Rating
              </label>
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="transition-colors"
                  >
                    <Star 
                      className={`w-8 h-8 ${
                        star <= rating 
                          ? 'fill-warning-default text-warning-default' 
                          : 'text-background-dark hover:text-warning-default'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-dark mb-2">
                Your Review (Optional)
              </label>
              <textarea
                className="w-full p-3 border border-background-dark rounded-lg focus:ring-2 focus:ring-primary-default focus:border-primary-default"
                rows={4}
                placeholder="Share your thoughts about this course..."
                value={review}
                onChange={(e) => setReview(e.target.value)}
              />
            </div>
            
            <div className="flex gap-3">
              <Button onClick={submitReview} disabled={rating === 0 || submittingReview}>
                {submittingReview ? 'Submitting...' : userReview ? 'Update Review' : 'Submit Review'}
              </Button>
              <Button variant="ghost" onClick={() => {
                setShowReviewForm(false)
                if (userReview) {
                  setRating(userReview.rating)
                  setReview(userReview.comment || '')
                } else {
                  setRating(0)
                  setReview('')
                }
              }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Recommended Courses */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold text-text-dark mb-6">Continue Your Learning Journey</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {recommendedCourses.map((c) => (
            <div key={c.id} className="border border-background-dark rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="w-full h-32 bg-background-medium rounded-lg flex items-center justify-center mb-4">
                <BookOpen className="w-8 h-8 text-text-muted" />
              </div>
              <h4 className="font-semibold text-text-dark mb-2">{c.title}</h4>
              <p className="text-sm text-text-light mb-3">{c.category?.name || 'Course'}</p>
              <div className="flex items-center gap-4 text-xs text-text-muted mb-4">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{(c.duration_minutes || 0)} min</span>
                </div>
              </div>
              <Link to={`/app/courses/${c.id}`}>
                <Button variant="secondary" size="sm" className="w-full">
                  View Course
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </Card>

      {/* Course Resources */}
      {course?.resources && Array.isArray(course.resources) && course.resources.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-semibold text-text-dark mb-4">Course Resources</h3>
          <p className="text-sm text-text-light mb-4">
            Access additional resources and materials from this course
          </p>
          <div className="space-y-3">
            {course.resources.map((resource) => (
              resource.type === 'link' ? (
                <a
                  key={resource.id}
                  href={normalizeUrl(resource.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-start p-3 border border-background-dark rounded-lg hover:bg-background-light cursor-pointer no-underline"
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
                  className="flex items-center justify-between p-3 border border-background-dark rounded-lg hover:bg-background-light cursor-pointer"
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
        </Card>
      )}

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link to={`/app/courses/${courseId}`}>
          <Button variant="secondary" size="lg">
            <BookOpen className="w-5 h-5 mr-2" />
            Review Course Content
          </Button>
        </Link>
        <Link to="/app/courses/my-courses">
          <Button variant="secondary" size="lg">
            View My Courses
          </Button>
        </Link>
        <Link to="/app/courses/catalog">
          <Button size="lg">
            Browse More Courses
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </Link>
      </div>

      {/* Certificate Preview Modal */}
      <CertificatePreviewModal
        courseId={courseId}
        courseName={course?.title || 'Course'}
        userId={user?.id}
        isOpen={showCertificateModal}
        onClose={() => setShowCertificateModal(false)}
      />
    </div>
  )
}
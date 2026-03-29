// src/pages/courses/LessonView.jsx
import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react'
import ReactPlayer from 'react-player'
import { useParams, useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom'
import { 
  Play, 
  Pause,
  CheckCircle,
  FileText,
  Download,
  BookOpen,
  Clock,
  ChevronLeft,
  ChevronRight,
  Settings,
  PanelRightClose,
  PanelRightOpen,
  Award,
  ExternalLink,
  File,
  ThumbsUp,
  ThumbsDown,
  MessageCircle
} from 'lucide-react'
import { ScormPlayer } from '@/components/course'
import PresentationViewer from '@/components/course/PresentationViewer'
import CertificatePreviewModal from '@/components/course/CertificatePreviewModal'
import PageTitle from '@/components/layout/PageTitle'
import { useCourseStore } from '@/store/courseStore'
import { useAuth } from '@/hooks/auth/useAuth'
import { useSubscription } from '@/hooks/courses/useSubscription'
import { supabase, TABLES } from '@/lib/supabase'
import { 
  Button, 
  Card, 
  LoadingSpinner, 
  useToast,
  ActionButton,
  StatusBadge,
  ContentTypeIcon,
  Modal
} from '@/components/ui'

// KnowledgeCheckCard - defined at module level to avoid re-creation on parent re-renders
const KnowledgeCheckCard = memo(({
  quiz,
  questions,
  onSubmit,
  onRetake,
  isCompleted,
  initialResult,
  isActive,
  variant = 'default',
  onContinue
}) => {
  const { success, error: showError } = useToast();
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(Boolean(initialResult));
  const [result, setResult] = useState(initialResult || null);

  useEffect(() => {
    if (initialResult) {
      setResult(initialResult);
      setShowFeedback(true);
      if (initialResult.answers) {
        setAnswers(initialResult.answers);
      }
    }
  }, [initialResult]);

  const evaluateAnswer = useCallback((question, answer) => {
    if (answer === undefined || answer === null) return false;

    switch (question.question_type) {
      case 'multiple_choice':
        return answer === question.correct_answer;
      case 'multiple_select': {
        const userSet = new Set(Array.isArray(answer) ? answer : []);
        const correctSet = new Set(Array.isArray(question.correct_answer) ? question.correct_answer : []);
        if (userSet.size !== correctSet.size) return false;
        for (const value of userSet) {
          if (!correctSet.has(value)) return false;
        }
        return true;
      }
      case 'true_false':
        return answer === question.correct_answer;
      case 'short_answer': {
        const userText = (answer || '').toString().trim().toLowerCase();
        const correctText = (question.correct_answer || '').toString().trim().toLowerCase();
        return userText.length > 0 && userText === correctText;
      }
      default:
        return false;
    }
  }, []);

  const computeResult = useCallback(() => {
    if (!questions || questions.length === 0) {
      return {
        score: 0,
        maxScore: 0,
        percentage: 0,
        breakdown: [],
      };
    }

    let score = 0;
    const breakdown = questions.map((question, idx) => {
      const answerKey = question.id ?? `q-${idx}`;
      const answer = answers[answerKey];
      const correct = evaluateAnswer(question, answer);
      if (correct) score += 1;
      return {
        questionId: question.id,
        questionIndex: idx,
        isCorrect: correct,
        userAnswer: answer,
        correctAnswer: question.correct_answer,
      };
    });

    const maxScore = questions.length;
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

    return {
      score,
      maxScore,
      percentage,
      breakdown,
      answers,
    };
  }, [answers, evaluateAnswer, questions]);

  const handleAnswerChange = useCallback((questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value,
    }));
  }, []);

  const handleSubmit = async () => {
    if (!questions || questions.length === 0) {
      showError('This knowledge check has no questions.');
      return;
    }

    const unanswered = questions.filter((question, idx) => {
      const answerKey = question.id ?? `q-${idx}`;
      const value = answers[answerKey];
      if (Array.isArray(value)) return value.length === 0;
      if (typeof value === 'string') return value.trim().length === 0;
      return value === undefined || value === null;
    });

    if (unanswered.length > 0) {
      showError('Please answer all questions before submitting.');
      return;
    }

    setIsSubmitting(true);
    const summary = computeResult();
    try {
      await onSubmit(quiz, answers, summary);
      setResult(summary);
      setShowFeedback(true);
      success('Knowledge check submitted successfully!');
    } catch (error) {
      showError('Failed to submit knowledge check. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetake = () => {
    setAnswers({});
    setResult(null);
    setShowFeedback(false);
    if (onRetake) {
      onRetake(quiz.id);
    }
  };

  const renderAnswerContent = (question, questionIndex) => {
    const answerKey = question.id ?? `q-${questionIndex}`;
    const currentAnswer = answers[answerKey];
    const feedback = showFeedback ? evaluateAnswer(question, currentAnswer) : null;

    const baseOptionClass = 'flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors';
    const neutralClasses = 'border-background-dark hover:border-primary-default';
    const correctClasses = 'border-success-default bg-success-superlight text-success-darker';
    const incorrectClasses = 'border-error-default bg-error-superlight text-error-darker';

    const getOptionClass = (isSelected, optionIndex, optionValue) => {
      if (!showFeedback) {
        return `${baseOptionClass} ${isSelected ? 'border-primary-default bg-primary-superlight text-primary-darker' : neutralClasses}`;
      }
      let optionCorrect = false;
      if (question.question_type === 'multiple_select') {
        optionCorrect = Array.isArray(question.correct_answer) && question.correct_answer.includes(optionIndex);
      } else if (question.question_type === 'true_false') {
        optionCorrect = optionValue === question.correct_answer;
      } else {
        optionCorrect = optionIndex === question.correct_answer;
      }
      if (optionCorrect) {
        return `${baseOptionClass} ${correctClasses}`;
      }
      if (isSelected && !optionCorrect) {
        return `${baseOptionClass} ${incorrectClasses}`;
      }
      return `${baseOptionClass} ${neutralClasses}`;
    };

    switch (question.question_type) {
      case 'multiple_choice':
        return (
          <div className="space-y-3">
            {question.options?.map((option, optionIndex) => {
              const isSelected = currentAnswer === optionIndex;
              return (
                <button
                  key={optionIndex}
                  type="button"
                  className={getOptionClass(isSelected, optionIndex, optionIndex)}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!showFeedback) {
                      handleAnswerChange(answerKey, optionIndex);
                    }
                  }}
                  disabled={showFeedback}
                  aria-pressed={isSelected}
                  style={{ cursor: showFeedback ? 'not-allowed' : 'pointer' }}
                >
                  <span className="font-medium">{String.fromCharCode(65 + optionIndex)}.</span>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>
        );
      case 'multiple_select': {
        const selectedAnswers = Array.isArray(currentAnswer) ? currentAnswer : [];
        return (
          <div className="space-y-3">
            {question.options?.map((option, optionIndex) => {
              const isSelected = selectedAnswers.includes(optionIndex);
              return (
                <button
                  key={optionIndex}
                  type="button"
                  className={getOptionClass(isSelected, optionIndex, optionIndex)}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (showFeedback) return;
                    const updated = new Set(selectedAnswers);
                    if (updated.has(optionIndex)) {
                      updated.delete(optionIndex);
                    } else {
                      updated.add(optionIndex);
                    }
                    handleAnswerChange(answerKey, Array.from(updated));
                  }}
                  disabled={showFeedback}
                  aria-pressed={isSelected}
                  style={{ cursor: showFeedback ? 'not-allowed' : 'pointer' }}
                >
                  <span className="font-medium">{String.fromCharCode(65 + optionIndex)}.</span>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>
        );
      }
      case 'true_false':
        return (
          <div className="space-y-3">
            {[true, false].map(value => {
              const label = value ? 'True' : 'False';
              const isSelected = currentAnswer === value;
              const optionIndex = value ? 1 : 0;
              return (
                <button
                  key={label}
                  type="button"
                  className={getOptionClass(isSelected, optionIndex, value)}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!showFeedback) {
                      handleAnswerChange(answerKey, value);
                    }
                  }}
                  disabled={showFeedback}
                  aria-pressed={isSelected}
                  style={{ cursor: showFeedback ? 'not-allowed' : 'pointer' }}
                >
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        );
      case 'short_answer':
        return (
          <div className="space-y-2">
            <textarea
              value={currentAnswer || ''}
              onChange={event => handleAnswerChange(answerKey, event.target.value)}
              disabled={showFeedback}
              placeholder="Type your response here..."
              className="w-full rounded-lg border border-background-dark px-3 py-2 text-sm focus:border-primary-default focus:outline-none focus:ring-2 focus:ring-primary-muted disabled:bg-background-light"
              rows={3}
            />
            {showFeedback && (
              <p className={`text-sm font-medium ${feedback ? 'text-success-darker' : 'text-error-darker'}`}>
                {feedback
                  ? 'Correct!'
                  : `Expected answer: ${question.correct_answer}`}
              </p>
            )}
          </div>
        );
      default:
        return <p className="text-sm text-text-light">Unsupported question type.</p>;
    }
  };

  const containerClassName = [
    'bg-white',
    'p-6',
    'transition-shadow',
    variant === 'modal'
      ? 'rounded-2xl shadow-lg sm:p-10 max-h-[70vh] overflow-y-auto'
      : variant === 'embedded'
        ? 'rounded-xl border border-background-dark shadow-sm'
        : 'rounded-2xl border border-background-dark shadow-sm',
    isActive ? 'ring-2 ring-primary-default shadow-lg' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      id={`knowledge-check-${quiz.id}`}
      className={containerClassName}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-primary-default">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-superlight px-2 py-1 font-semibold text-primary-darker">
              <CheckCircle className="h-3 w-3" />
              Knowledge Check
            </span>
            {questions?.length ? (
              <span className="text-text-light">
                {questions.length} {questions.length === 1 ? 'question' : 'questions'}
              </span>
            ) : null}
          </div>
          <h3 className="mt-3 text-lg font-semibold text-text-dark">{quiz.title}</h3>
          {quiz.description && <p className="mt-2 text-sm text-text-light">{quiz.description}</p>}
        </div>

        <div className="flex items-center gap-2">
          {isCompleted ? (
            <StatusBadge status="success" label="Completed" />
          ) : (
            <StatusBadge status="warning" label="In Progress" />
          )}
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {questions && questions.length > 0 ? (
          questions.map((question, index) => {
            const breakdownEntry = result?.breakdown?.find(entry => entry.questionId === question.id);
            const questionFeedback = breakdownEntry ? breakdownEntry.isCorrect : null;
            return (
              <div key={question.id || `${quiz.id}-${index}`} className="space-y-4 rounded-lg border border-background-dark p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-text-dark">
                      {index + 1}. {question.question_text}
                    </p>
                    {showFeedback && questionFeedback !== null && (
                      <p className={`mt-2 text-xs font-medium ${questionFeedback ? 'text-success-darker' : 'text-error-darker'}`}>
                        {questionFeedback
                          ? 'Great job! You got all questions correct.'
                          : 'Review the questions you missed and try again.'}
                      </p>
                    )}
                  </div>
                </div>
                {renderAnswerContent(question, index)}
              </div>
            );
          })
        ) : (
          <div className="rounded-lg border border-dashed border-background-dark p-6 text-center text-sm text-text-light">
            No questions available for this knowledge check.
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {result && showFeedback ? (
          <div className="flex items-center gap-3 text-sm text-text-light">
            <div className="flex items-center gap-1 rounded-full bg-primary-superlight px-3 py-1 font-medium text-primary-darker">
              Score: {result.score}/{result.maxScore}
            </div>
            <span>Accuracy: {result.percentage}%</span>
          </div>
        ) : (
          <p className="text-sm text-text-light">
            Answer all questions to complete this knowledge check.
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          {showFeedback && (
            <>
              <Button variant="ghost" onClick={handleRetake} size="sm">
                Try Again
              </Button>
              {onContinue && (
                <Button onClick={onContinue} size="sm">
                  Continue
                </Button>
              )}
            </>
          )}
          {!showFeedback && (
            <Button onClick={handleSubmit} disabled={isSubmitting} size="sm">
              {isSubmitting
                ? 'Submitting...'
                : 'Check Answers'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});

KnowledgeCheckCard.displayName = 'KnowledgeCheckCard';

// Custom hook for intersection observer (lazy loading)
const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [hasIntersected, setHasIntersected] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting)
      if (entry.isIntersecting && !hasIntersected) {
        setHasIntersected(true)
      }
    }, options)

    observer.observe(element)
    return () => observer.disconnect()
  }, [options, hasIntersected])

  return [ref, isIntersecting, hasIntersected]
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

// AudioPlayer - defined at module level to avoid re-creation on parent re-renders
const AudioPlayer = memo(({ audioUrl }) => {
  return (
    <div className="bg-gray-50 rounded-lg p-6">
      {audioUrl ? (
        <div className="w-full aspect-video bg-gray-50 rounded-lg overflow-hidden">
          <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <div className="mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 text-2xl">🎵</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Audio Lesson</h3>
              <p className="text-sm text-gray-600">Use the controls below to play the audio content</p>
            </div>
            
            <div className="max-w-md mx-auto mb-4">
              <audio
                controls
                className="w-full h-12"
                preload="metadata"
                onError={(e) => {
                  console.error('Audio playback error:', e);
                }}
              >
                <source src={audioUrl} type="audio/mpeg" />
                <source src={audioUrl} type="audio/wav" />
                <source src={audioUrl} type="audio/ogg" />
                <source src={audioUrl} type="audio/m4a" />
                <source src={audioUrl} type="audio/aac" />
                <source src={audioUrl} type="audio/webm" />
                Your browser does not support the audio element.
              </audio>
            </div>

            <div className="flex justify-center space-x-3 mb-4">
              <Button 
                variant="secondary" 
                onClick={() => window.open(audioUrl, '_blank')}
                className="text-sm"
              >
                Download Audio
              </Button>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg max-w-md">
              <p className="text-xs text-blue-700">
                💡 <strong>Tip:</strong> You can use the built-in controls to play, pause, seek, and adjust volume.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500 p-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-gray-400 text-2xl">🎵</span>
          </div>
          <div className="text-gray-500 text-lg mb-2">No audio available</div>
          <p className="text-sm">The audio content could not be loaded.</p>
        </div>
      )}
    </div>
  );
});
AudioPlayer.displayName = 'AudioPlayer';

const presentationFetchCache = new Map();

const PresentationWrapper = memo(({
  lessonId,
  lesson,
  userId,
  isCompleted,
  onPresentationComplete,
  onMarkComplete,
  onPreviousLesson,
  onNextLesson,
  hasPreviousLesson,
  hasNextLesson
}) => {
  const cached = presentationFetchCache.get(lessonId);
  const [presentation, setPresentation] = useState(cached?.data || null);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(cached?.error || null);
  const fetchPresentationByLesson = useCourseStore(state => state.actions.fetchPresentationByLesson);

  useEffect(() => {
    if (presentationFetchCache.has(lessonId)) return;

    let cancelled = false;
    const loadPresentation = async () => {
      try {
        setLoading(true);
        const result = await fetchPresentationByLesson(lessonId);
        if (cancelled) return;
        if (result.error) {
          presentationFetchCache.set(lessonId, { error: result.error });
          setError(result.error);
        } else {
          presentationFetchCache.set(lessonId, { data: result.data });
          setPresentation(result.data);
        }
      } catch (err) {
        if (!cancelled) {
          presentationFetchCache.set(lessonId, { error: err.message });
          setError(err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPresentation();
    return () => { cancelled = true; };
  }, [lessonId, fetchPresentationByLesson]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-gray-500 p-8">
        <div className="text-red-500 text-lg mb-2">Error loading presentation</div>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!presentation) {
    return (
      <div className="text-center text-gray-500 p-8">
        <div className="text-gray-500 text-lg mb-2">No presentation found</div>
        <p className="text-sm">This lesson doesn&apos;t have a presentation yet.</p>
      </div>
    );
  }

  return (
    <PresentationViewer
      presentation={presentation}
      lesson={lesson}
      userId={userId}
      onSlideComplete={() => {}}
      onPresentationComplete={onPresentationComplete}
      isCompleted={isCompleted}
      onMarkComplete={onMarkComplete}
      onPreviousLesson={onPreviousLesson}
      onNextLesson={onNextLesson}
      hasPreviousLesson={hasPreviousLesson}
      hasNextLesson={hasNextLesson}
    />
  );
});
PresentationWrapper.displayName = 'PresentationWrapper';

function formatElapsedTime(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${mins}:${String(secs).padStart(2, '0')}`
}

export default function LessonView() {
  const { courseId, lessonId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { canAccessAssessments, canAccessCertificates } = useSubscription()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Store selectors - individual to prevent infinite loops
  const courses = useCourseStore(state => state.courses)
  const enrolledCourses = useCourseStore(state => state.enrolledCourses)
  const courseProgress = useCourseStore(state => state.courseProgress)
  const actions = useCourseStore(state => state.actions)
  const fetchEnrolledCourses = useCourseStore(state => state.actions.fetchEnrolledCourses)
  
  const [lesson, setLesson] = useState(null)
  const [course, setCourse] = useState(null)
  const [previousLesson, setPreviousLesson] = useState(null) // Keep previous lesson to prevent flicker
  const [previousCourse, setPreviousCourse] = useState(null) // Keep previous course to prevent flicker
  
  // Get course from store as fallback if local state isn't set yet
  const courseFromStore = useMemo(() => {
    if (course) return course
    return courses.find(c => c.id === courseId) || null
  }, [course, courses, courseId])
  
  // Use previous lesson/course if current is loading to prevent flicker
  const displayLesson = useMemo(() => {
    if (lesson) return lesson
    if (previousLesson && previousLesson.id === lessonId) return previousLesson
    return null
  }, [lesson, previousLesson, lessonId])
  
  const displayCourse = useMemo(() => {
    if (course) return course
    if (previousCourse && previousCourse.id === courseId) return previousCourse
    return courseFromStore
  }, [course, previousCourse, courseId, courseFromStore])
  
  // Check if user can manage this course (course creator or has permissions)
  const canManageCourse = useMemo(() => {
    if (!user?.id || !courseFromStore) return false
    return courseFromStore.created_by === user.id
  }, [user?.id, courseFromStore])
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)
  const [notes, setNotes] = useState('')
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [notesLoaded, setNotesLoaded] = useState(false)
  const [videoLoading, setVideoLoading] = useState(false)
  const [videoError, setVideoError] = useState(null)
  const [isCompleting, setIsCompleting] = useState(false)
  const [haltVideo, setHaltVideo] = useState(false)
  const [playerKey, setPlayerKey] = useState(0)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState('description')
  const [lessonFeedback, setLessonFeedback] = useState(null) // 'up' or 'down'
  const [quizzesByLesson, setQuizzesByLesson] = useState({})
  const [quizCompletionStatus, setQuizCompletionStatus] = useState({})
  const [quizQuestionsById, setQuizQuestionsById] = useState({})
  const [knowledgeCheckResults, setKnowledgeCheckResults] = useState({})
  const [activeKnowledgeCheckId, setActiveKnowledgeCheckId] = useState(() => searchParams.get('knowledgeCheck'))
  const [showCertificateModal, setShowCertificateModal] = useState(false)
  const [courseFinalAssessment, setCourseFinalAssessment] = useState(null)
  const [finalAssessmentCompleted, setFinalAssessmentCompleted] = useState(false)
  const { success, error: showError } = useToast()

  // Live session timer - ticks every second, pauses when tab is hidden
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const isPageVisibleRef = useRef(true)
  const timerInitLessonRef = useRef(null)

  // Initialize elapsed time from saved progress when lesson changes
  useEffect(() => {
    if (timerInitLessonRef.current !== lessonId) {
      timerInitLessonRef.current = null
      setElapsedSeconds(0)
    }
  }, [lessonId])

  useEffect(() => {
    if (!lesson?.id || !course?.id || timerInitLessonRef.current === lesson.id) return
    const progress = courseProgress[course.id]?.[lesson.id]
    if (progress !== undefined) {
      timerInitLessonRef.current = lesson.id
      setElapsedSeconds(progress?.time_spent_seconds || 0)
    }
  }, [lesson?.id, course?.id, courseProgress])

  // 1-second tick that pauses when the tab/window is hidden
  useEffect(() => {
    if (!lesson?.id || !user?.id) return

    isPageVisibleRef.current = document.visibilityState === 'visible'

    const handleVisibility = () => {
      isPageVisibleRef.current = document.visibilityState === 'visible'
    }
    document.addEventListener('visibilitychange', handleVisibility)

    const tickId = setInterval(() => {
      if (isPageVisibleRef.current) {
        setElapsedSeconds(prev => prev + 1)
      }
    }, 1000)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      clearInterval(tickId)
    }
  }, [lesson?.id, user?.id])

  const knowledgeChecks = useMemo(() => {
    if (!lesson?.id) return [];
    const lessonQuizzes = quizzesByLesson[lesson.id] || [];
    return lessonQuizzes.filter(quizEntry => quizEntry.quiz_type === 'non_graded');
  }, [lesson?.id, quizzesByLesson]);
  const activateKnowledgeCheck = useCallback(
    (quizId) => {
      setActiveKnowledgeCheckId(quizId);
      const nextParams = new URLSearchParams(searchParams);
      if (quizId) {
        nextParams.set('knowledgeCheck', quizId);
      } else {
        nextParams.delete('knowledgeCheck');
      }
      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const activeKnowledgeCheck = useMemo(
    () => knowledgeChecks.find(quiz => quiz.id === activeKnowledgeCheckId) || null,
    [knowledgeChecks, activeKnowledgeCheckId]
  );

  const firstIncompleteKnowledgeCheck = useMemo(
    () => knowledgeChecks.find(quiz => !quizCompletionStatus[quiz.id]) || null,
    [knowledgeChecks, quizCompletionStatus]
  );

  useEffect(() => {
    if (!knowledgeChecks.length && activeKnowledgeCheckId) {
      setActiveKnowledgeCheckId(null);
    }
  }, [knowledgeChecks.length, activeKnowledgeCheckId]);

  // Calculate course progress data first (needed for isCourseCompleted)
  const courseProgressData = useMemo(() => {
    const totalLessons = lessons.length || 0;
    const progressPercentage = course && courseProgress[courseId] && totalLessons > 0 ? 
      Math.round((Object.values(courseProgress[courseId]).filter(p => p.completed).length / totalLessons) * 100) : 0;
    
    return {
      percentage: progressPercentage,
      completedCount: course && courseProgress[courseId] ? 
        Object.values(courseProgress[courseId]).filter(p => p.completed).length : 0,
      totalCount: totalLessons
    };
  }, [course, courseProgress, courseId, lessons.length]);

  // Check if course is completed (for review mode) - must be defined before goToNextLesson
  const isCourseCompleted = useMemo(() => {
    if (!courseId || !user?.id) return false;
    
    // Check enrollment progress first
    const enrollment = enrolledCourses?.find(e => 
      (e.course_id === courseId || e.id === courseId) && e.progress_percentage >= 100
    );
    
    if (enrollment) return true;
    
    // Fallback: check course progress from lesson completion
    return courseProgressData.percentage >= 100;
  }, [courseId, user?.id, enrolledCourses, courseProgressData.percentage]);

  // Check if minimum time requirement is met for current lesson
  const timeRequirementMet = useMemo(() => {
    if (isCourseCompleted) return true; // Allow navigation in review mode
    if (!user?.id || !lesson || !course) return false;
    
    const progress = courseProgress[course.id]?.[lesson.id];
    if (!progress) return false;
    
    // If no minimum time required, allow progression
    if (!progress.minimum_time_required) return true;
    
    // Check if review is completed (time spent >= minimum required)
    return progress.review_completed === true;
  }, [isCourseCompleted, user?.id, lesson, course, courseProgress, courseId]);

  // Calculate time remaining for display (uses live elapsedSeconds)
  const timeRemainingInfo = useMemo(() => {
    if (isCourseCompleted || timeRequirementMet) return null;
    if (!user?.id || !lesson || !course) return null;
    
    const progress = courseProgress[course.id]?.[lesson.id];
    if (!progress || !progress.minimum_time_required) return null;
    
    const timeRequired = progress.minimum_time_required;
    const timeRemaining = Math.max(0, timeRequired - elapsedSeconds);
    const totalMinutesRequired = Math.ceil(timeRequired / 60);
    
    return {
      timeRemaining,
      totalMinutesRequired,
      timeSpent: elapsedSeconds,
      timeRequired
    };
  }, [isCourseCompleted, timeRequirementMet, user?.id, lesson, course, courseProgress, courseId, elapsedSeconds]);

  const goToNextLesson = useCallback(async (shouldBypassKnowledgeChecks = false) => {
    // For completed courses, allow free navigation (review mode)
    if (isCourseCompleted) {
      // Skip all restrictions for completed courses
      shouldBypassKnowledgeChecks = true;
    } else {
      // Check if lesson has been reviewed for minimum time (only for incomplete courses)
      if (user?.id && lesson && course) {
        const progress = courseProgress[course.id]?.[lesson.id];
        if (progress && progress.minimum_time_required && !progress.review_completed) {
          const timeRemaining = progress.minimum_time_required - (progress.time_spent_seconds || 0);
          const minutesRemaining = Math.ceil(timeRemaining / 60);
          showError(`Please review this lesson for at least ${Math.ceil(progress.minimum_time_required / 60)} minutes before proceeding. You need ${minutesRemaining} more minute${minutesRemaining !== 1 ? 's' : ''}.`);
          return;
        }
      }
      
      if (!shouldBypassKnowledgeChecks && firstIncompleteKnowledgeCheck) {
        if (firstIncompleteKnowledgeCheck.id !== activeKnowledgeCheckId) {
          activateKnowledgeCheck(firstIncompleteKnowledgeCheck.id);
        }
        showError('Complete the knowledge check before moving on.');
        return;
      }
    }

    if (course && lesson) {
      try {
        const { data: lessonsData } = await actions.fetchCourseLessons(course.id);
        if (lessonsData && Object.keys(lessonsData).length > 0) {
          const flatLessons = [];
          Object.values(lessonsData).forEach(moduleData => {
            if (moduleData.lessons && Array.isArray(moduleData.lessons)) {
              flatLessons.push(...moduleData.lessons);
            }
          });

          flatLessons.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

          const currentIndex = flatLessons.findIndex(l => l.id === lessonId);
          const nextLesson = flatLessons[currentIndex + 1];
          if (nextLesson) {
            activateKnowledgeCheck(null);
            navigate(`/app/courses/${courseId}/lesson/${nextLesson.id}`);
          } else {
            const allLessonsCompleted = lessons.every(lessonEntry => (
              courseProgress[courseId]?.[lessonEntry.id]?.completed
            ));

            if (!allLessonsCompleted) {
              showError('Keep going! Mark every lesson as completed to finish the course.');
              return;
            }

            activateKnowledgeCheck(null);
            
            if (courseFinalAssessment && !finalAssessmentCompleted && canAccessAssessments(displayCourse)) {
              navigate(`/app/courses/${courseId}/quiz/${courseFinalAssessment.id}`);
            } else {
              navigate(`/app/courses/${courseId}/completion`);
            }
          }
        }
      } catch (_) {
        // Ignore navigation errors
      }
    }
  }, [
    firstIncompleteKnowledgeCheck,
    activeKnowledgeCheckId,
    showError,
    course,
    lesson,
    actions,
    lessonId,
    courseId,
    navigate,
    activateKnowledgeCheck,
    lessons,
    courseProgress,
    courseFinalAssessment,
    finalAssessmentCompleted,
    isCourseCompleted
  ]);

  const advanceAfterKnowledgeCheck = useCallback(() => {
    const remaining = knowledgeChecks.filter(quiz => !quizCompletionStatus[quiz.id]);

    if (remaining.length > 0) {
      activateKnowledgeCheck(remaining[0].id);
      return;
    }

    activateKnowledgeCheck(null);
    goToNextLesson(true);
  }, [knowledgeChecks, quizCompletionStatus, activateKnowledgeCheck, goToNextLesson]);

  const handleKnowledgeCheckModalClose = useCallback(() => {
    if (!activeKnowledgeCheckId) {
      return;
    }

    const isCompleted = Boolean(quizCompletionStatus[activeKnowledgeCheckId]);
    if (isCompleted) {
      advanceAfterKnowledgeCheck();
      return;
    }

    activateKnowledgeCheck(null);
  }, [activeKnowledgeCheckId, quizCompletionStatus, advanceAfterKnowledgeCheck, activateKnowledgeCheck]);

  const handleKnowledgeCheckContinue = useCallback(
    (quizId) => {
      const isCompleted = Boolean(quizCompletionStatus[quizId]);
      if (!isCompleted) {
        return;
      }

      advanceAfterKnowledgeCheck();
    },
    [quizCompletionStatus, advanceAfterKnowledgeCheck]
  );

  const knowledgeCheckParam = useMemo(() => searchParams.get('knowledgeCheck'), [searchParams]);

  // Player refs
  const playerRef = useRef(null)
  const videoReadyRef = useRef(false)
  const videoTimeoutRef = useRef(null)

  useEffect(() => {
    if (knowledgeCheckParam === activeKnowledgeCheckId) {
      return;
    }

    if (knowledgeCheckParam) {
      setActiveKnowledgeCheckId(knowledgeCheckParam);
      return;
    }

    if (!knowledgeCheckParam && activeKnowledgeCheckId) {
      setActiveKnowledgeCheckId(null);
    }
  }, [knowledgeCheckParam, activeKnowledgeCheckId])

  // Effect to sync playback position when using ReactPlayer
  useEffect(() => {
    if (playerRef.current && lesson?.content_type === 'video' && currentTime > 0) {
      try {
        playerRef.current.seekTo(currentTime, 'seconds')
      } catch (_) {}
    }
  }, [lesson?.content_type, currentTime])

  // Effect to handle video loading timeout
  useEffect(() => {
    if (lesson?.content_type === 'video' && lesson?.content_url && !isYouTubeUrl(lesson.content_url)) {
      setVideoLoading(true);
      setVideoError(null);
      setHaltVideo(false);
      videoReadyRef.current = false;
      if (videoTimeoutRef.current) {
        clearTimeout(videoTimeoutRef.current);
      }
      videoTimeoutRef.current = setTimeout(() => {
        if (!videoReadyRef.current) {
          setVideoError({
            error: null,
            errorCode: 'TIMEOUT',
            errorMessage: 'Video playback timed out. Please check your connection and try again.',
            networkState: 3,
            readyState: 0,
            src: lesson.content_url
          });
          setVideoLoading(false);
          setHaltVideo(true);
        }
      }, 45000);
      return () => {
        if (videoTimeoutRef.current) {
          clearTimeout(videoTimeoutRef.current);
          videoTimeoutRef.current = null;
        }
      };
    }
  }, [lesson?.content_type, lesson?.content_url]);

  useEffect(() => {
    if (!activeKnowledgeCheckId) return

    if (typeof document === 'undefined') return

    const scrollToKnowledgeCheck = () => {
      const element = document.getElementById(`knowledge-check-${activeKnowledgeCheckId}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }

    const timeoutId = setTimeout(scrollToKnowledgeCheck, 150)
    return () => clearTimeout(timeoutId)
  }, [activeKnowledgeCheckId])

  // Track if data has been loaded to prevent infinite loops
  const dataLoadedRef = useRef({ courseId: null, lessonId: null });
  const isLoadingRef = useRef(false);

  // Load course and lesson data from store
  useEffect(() => {
    // Early return if no courseId or lessonId
    if (!courseId || !lessonId) {
      return;
    }

    // Prevent re-fetching if we've already loaded data for this course/lesson
    if (dataLoadedRef.current.courseId === courseId && dataLoadedRef.current.lessonId === lessonId) {
      return;
    }

    // Prevent concurrent loads
    if (isLoadingRef.current) {
      return;
    }

    // Set loading state when courseId or lessonId changes
    // This happens when navigating to a new course/lesson
    setLoading(true);

    const loadCourseData = async () => {
      isLoadingRef.current = true;
      try {
        // Get current courses from store directly to avoid dependency issues
        let coursesToUse = useCourseStore.getState().courses;
        if (coursesToUse.length === 0) {
          if (user?.id) {
            await actions.fetchCourses({}, user.id)
          } else {
            await actions.fetchCourses()
          }
          // Get fresh courses after fetch
          coursesToUse = useCourseStore.getState().courses;
        }
        
        // Find the current course
        const foundCourse = coursesToUse.find(c => c.id === courseId)
        if (foundCourse) {
          setPreviousCourse(course) // Save current before updating
          setCourse(foundCourse)
          actions.setCurrentCourse(foundCourse)
          
          // Fetch course lessons
          const { data: fetchedLessons } = await actions.fetchCourseLessons(courseId)
          if (fetchedLessons && Object.keys(fetchedLessons).length > 0) {
            // Convert grouped lessons to flat array for navigation
            // Preserve module information on each lesson
            const flatLessons = [];
            Object.values(fetchedLessons).forEach(moduleData => {
              if (moduleData.lessons && Array.isArray(moduleData.lessons)) {
                moduleData.lessons.forEach(lesson => {
                  // Ensure module info is available on the lesson
                  if (!lesson.module && moduleData.module) {
                    lesson.module = moduleData.module;
                  }
                  flatLessons.push(lesson);
                });
              }
            });
            
            // Sort lessons by their order_index
            flatLessons.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
            
            setLessons(prevLessons => {
              const isSameLength = prevLessons.length === flatLessons.length;
              const hasSameOrder = isSameLength && prevLessons.every((lessonItem, index) => lessonItem.id === flatLessons[index].id);
              return hasSameOrder ? prevLessons : flatLessons;
            })

            // Fetch quizzes for the whole course to build lesson->quizzes map
            try {
              const { data: courseQuizzes } = await actions.fetchQuizzes(courseId)
              if (courseQuizzes && Array.isArray(courseQuizzes)) {
                const map = {};
                const questionMap = {};
                // Sort quizzes by order_index first, then by created_at
                const sorted = [...courseQuizzes].sort((a, b) => {
                  if (a.order_index !== null && b.order_index !== null) {
                    return a.order_index - b.order_index;
                  }
                  if (a.order_index !== null) return -1;
                  if (b.order_index !== null) return 1;
                  return new Date(a.created_at) - new Date(b.created_at);
                });

                // Separate course-level final assessments from lesson quizzes
                const courseLevelFinalAssessments = [];
                const quizzesWithQuestions = [];
                
                for (const quiz of sorted) {
                  // Check if quiz has questions
                  try {
                    const { data: questions } = await actions.fetchQuizQuestions(quiz.id);
                    if (questions && questions.length > 0) {
                      // Course-level final assessment: graded quiz without lesson_id
                      if (!quiz.lesson_id && quiz.quiz_type === 'graded') {
                        courseLevelFinalAssessments.push({
                          ...quiz,
                          question_count: questions.length
                        });
                        questionMap[quiz.id] = questions;
                      } else if (quiz.lesson_id) {
                        // Lesson-level quiz
                        quizzesWithQuestions.push({
                          ...quiz,
                          question_count: questions.length
                        });
                        questionMap[quiz.id] = questions;
                      }
                    }
                  } catch (error) {
                    // Skip this quiz if we can't fetch its questions
                  }
                }

                // Set the first course-level final assessment (if any)
                if (courseLevelFinalAssessments.length > 0) {
                  setCourseFinalAssessment(courseLevelFinalAssessments[0]);
                  
                  // Check if final assessment is completed
                  if (user?.id) {
                    try {
                      const { data: attempts } = await actions.fetchQuizAttempts(user.id, courseLevelFinalAssessments[0].id);
                      const hasPassedAttempt = attempts && attempts.some(attempt => attempt.passed);
                      setFinalAssessmentCompleted(hasPassedAttempt || false);
                    } catch (error) {
                      setFinalAssessmentCompleted(false);
                    }
                  }
                } else {
                  setCourseFinalAssessment(null);
                  setFinalAssessmentCompleted(false);
                }

                // Build the map with only quizzes that have questions, sorted by order_index
                quizzesWithQuestions.forEach(q => {
                  if (!map[q.lesson_id]) map[q.lesson_id] = [];
                  map[q.lesson_id].push(q);
                });

                // Sort quizzes within each lesson by order_index
                Object.keys(map).forEach(lessonId => {
                  map[lessonId].sort((a, b) => {
                    if (a.order_index !== null && b.order_index !== null) {
                      return a.order_index - b.order_index;
                    }
                    if (a.order_index !== null) return -1;
                    if (b.order_index !== null) return 1;
                    return new Date(a.created_at) - new Date(b.created_at);
                  });
                });

                setQuizzesByLesson(map);
                setQuizQuestionsById(questionMap);
              } else {
                setQuizzesByLesson({})
                setQuizQuestionsById({})
                setCourseFinalAssessment(null)
                setFinalAssessmentCompleted(false)
              }
            } catch (_) {
              setQuizzesByLesson({})
              setQuizQuestionsById({})
              setCourseFinalAssessment(null)
              setFinalAssessmentCompleted(false)
            }
            // Find the current lesson
            const foundLesson = flatLessons.find(l => l.id === lessonId)
            if (foundLesson) {
              setPreviousLesson(lesson) // Save current before updating
              setLesson(foundLesson)
              actions.setCurrentLesson(foundLesson)
              
              // Reset notes state when lesson changes
              setNotes('')
              setNotesLoaded(false)
              
              // Check if lesson is completed and load existing time
              if (user?.id) {
                const { data: progress } = await actions.fetchCourseProgress(user.id, courseId)
                const lessonProgress = progress?.[lessonId]
                setIsCompleted(lessonProgress?.completed || false)
                
                // Load notes for this lesson
                loadNotes(user.id, lessonId, courseId)
              }
            }
          }
        }
        
        // Mark data as loaded for this course/lesson combination
        dataLoadedRef.current = { courseId, lessonId };
        setLoading(false)
      } catch (_) {
        // Handle error silently or set error state if needed
        setLoading(false)
        // Don't mark as loaded on error - allow retry on next render
      } finally {
        isLoadingRef.current = false;
      }
    }

    if (courseId && lessonId) {
      loadCourseData()
    }
  }, [courseId, lessonId, user?.id])

  // Load notes for the current lesson
  const loadNotes = useCallback(async (userId, lessonId, courseId) => {
    if (!userId || !lessonId || !courseId) return
    
    try {
      const { data, error } = await supabase
        .from(TABLES.LESSON_PROGRESS)
        .select('metadata')
        .eq('user_id', userId)
        .eq('lesson_id', lessonId)
        .eq('course_id', courseId)
        .maybeSingle()
      
      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" which is fine
        setNotesLoaded(true)
        return
      }
      
      // Handle metadata - it might be a string or an object
      let metadata = data?.metadata
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata)
        } catch {
          metadata = {}
        }
      }
      
      if (metadata && typeof metadata === 'object' && metadata.notes) {
        setNotes(metadata.notes || '')
      } else {
        setNotes('')
      }
      setNotesLoaded(true)
    } catch (error) {
      // Handle error silently
      setNotes('')
      setNotesLoaded(true)
    }
  }, [])

  // Fetch enrolled courses to check completion status
  useEffect(() => {
    if (user?.id) {
      fetchEnrolledCourses(user.id)
    }
  }, [user?.id, fetchEnrolledCourses])

  // Load notes when lesson, course, or user changes
  useEffect(() => {
    if (user?.id && lesson?.id && course?.id && !notesLoaded) {
      loadNotes(user.id, lesson.id, course.id)
    }
  }, [user?.id, lesson?.id, course?.id, notesLoaded, loadNotes])

  const saveProgress = useCallback(async (additionalTime = 0, completedOverride = null) => {
    if (!user?.id || !lesson?.id || !course?.id) {
      return;
    }
    
    if (user.id === 'undefined' || lesson.id === 'undefined' || course.id === 'undefined') {
      return;
    }
    
    try {
      const completedFlag = completedOverride !== null ? completedOverride : isCompleted;
      const currentCourseProgress = useCourseStore.getState().courseProgress;
      const currentProgress = currentCourseProgress[course.id]?.[lesson.id];
      const wasReviewCompleted = currentProgress?.review_completed || false;
      
      const result = await actions.updateLessonProgress(
        user.id,
        lesson.id,
        course.id,
        completedFlag,
        { 
          timeSpent: additionalTime,
          lastAccessed: new Date().toISOString()
        }
      )
      
      if (result?.reviewCompleted && !wasReviewCompleted) {
        await actions.fetchCourseProgress(user.id, course.id)
      }
    } catch (_) {
      // Handle error silently
    }
  }, [user?.id, lesson?.id, course?.id, isCompleted, actions])

  // Save notes for the current lesson
  const saveNotes = useCallback(async () => {
    if (!user?.id || !lesson?.id || !course?.id) {
      showError('Unable to save notes. Please try again.')
      return
    }
    
    setIsSavingNotes(true)
    
    try {
      // First, check if lesson_progress entry exists
      const { data: existingProgress, error: checkError } = await supabase
        .from(TABLES.LESSON_PROGRESS)
        .select('id, metadata, completed')
        .eq('user_id', user.id)
        .eq('lesson_id', lesson.id)
        .eq('course_id', course.id)
        .maybeSingle()
      
      // Handle metadata - it might be a string or an object
      let existingMetadata = existingProgress?.metadata || {}
      if (typeof existingMetadata === 'string') {
        try {
          existingMetadata = JSON.parse(existingMetadata)
        } catch {
          existingMetadata = {}
        }
      }
      
      // Ensure metadata is an object
      if (typeof existingMetadata !== 'object' || existingMetadata === null) {
        existingMetadata = {}
      }
      
      // Create new metadata object that preserves existing fields and adds/updates notes
      const updatedMetadata = {
        ...existingMetadata,
        notes: notes
      }
      
      if (existingProgress) {
        // Update existing progress entry - preserve all fields including completed status
        const { error: updateError } = await supabase
          .from(TABLES.LESSON_PROGRESS)
          .update({ 
            metadata: updatedMetadata,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingProgress.id)
        
        if (updateError) throw updateError
      } else {
        // Create new progress entry with notes
        const { error: insertError } = await supabase
          .from(TABLES.LESSON_PROGRESS)
          .insert({
            user_id: user.id,
            lesson_id: lesson.id,
            course_id: course.id,
            completed: false,
            metadata: updatedMetadata,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        
        if (insertError) throw insertError
      }
      
      // Verify the save worked by fetching the data back
      const { data: verifyData } = await supabase
        .from(TABLES.LESSON_PROGRESS)
        .select('metadata')
        .eq('id', existingProgress?.id || 'just-saved')
        .maybeSingle()
      
      if (verifyData?.metadata?.notes !== notes) {
        // Notes weren't saved correctly, try one more time
        const finalMetadata = {
          ...(typeof verifyData?.metadata === 'object' ? verifyData.metadata : {}),
          notes: notes
        }
        await supabase
          .from(TABLES.LESSON_PROGRESS)
          .update({ metadata: finalMetadata })
          .eq('user_id', user.id)
          .eq('lesson_id', lesson.id)
          .eq('course_id', course.id)
      }
      
      success('Notes saved successfully!')
    } catch (error) {
      showError('Failed to save notes. Please try again.')
    } finally {
      setIsSavingNotes(false)
    }
  }, [user?.id, lesson?.id, course?.id, notes, success, showError])

  // Ref to hold the latest saveProgress without triggering effect re-runs
  const saveProgressRef = useRef(saveProgress);
  useEffect(() => {
    saveProgressRef.current = saveProgress;
  }, [saveProgress]);

  // Track time for all content types (videos, PDFs, text, etc.)
  // Pauses accumulation when the tab/window is hidden
  useEffect(() => {
    if (!lesson?.id || !course?.id || !user?.id) return
    
    let intervalId = null
    let lastSaveTime = Date.now()
    
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        lastSaveTime = Date.now()
      } else {
        const elapsed = Math.floor((Date.now() - lastSaveTime) / 1000)
        if (elapsed > 0) {
          saveProgressRef.current(elapsed)
        }
      }
    }
    
    document.addEventListener('visibilitychange', onVisibilityChange)
    
    const trackTime = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now()
        const timeSinceLastSave = Math.floor((now - lastSaveTime) / 1000)
        
        if (timeSinceLastSave >= 30) {
          saveProgressRef.current(timeSinceLastSave)
          lastSaveTime = now
        }
      }
    }
    
    lastSaveTime = Date.now()
    intervalId = setInterval(trackTime, 30000)
    
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      if (intervalId) clearInterval(intervalId)
      if (document.visibilityState === 'visible') {
        const finalTime = Math.floor((Date.now() - lastSaveTime) / 1000)
        if (finalTime > 0) {
          saveProgressRef.current(finalTime)
        }
      }
    }
  }, [lesson?.id, course?.id, user?.id])

  const markAsCompleted = async () => {
    if (user?.id && lesson && course) {
      try {
        setIsCompleting(true)
        
        // Get current progress to preserve time spent
        const currentProgress = courseProgress[course.id]?.[lesson.id];
        const existingTimeSpent = currentProgress?.time_spent_seconds || 0;
        
        // Mark as complete and save progress
        const result = await actions.updateLessonProgress(
          user.id,
          lesson.id,
          course.id,
          true,
          { 
            timeSpent: 0, // Additional time (already accumulated in existing progress)
            completedAt: new Date().toISOString(),
            lastAccessed: new Date().toISOString()
          }
        )
        
        if (result?.error) {
          showError('Failed to mark lesson as complete. Please try again.')
          setIsCompleting(false)
          return
        }
        
        // Update local state immediately
        setIsCompleted(true)
        
        // Refresh course progress to ensure UI is updated
        await actions.fetchCourseProgress(user.id, course.id)
        
        success('Lesson marked as complete!')
        
        // If this lesson has knowledge check(s), show the first incomplete one (don't skip it)
        const lessonKnowledgeChecks = (quizzesByLesson[lesson.id] || []).filter(q => q.quiz_type === 'non_graded');
        const firstIncomplete = lessonKnowledgeChecks.find(q => !quizCompletionStatus[q.id]);
        if (firstIncomplete) {
          activateKnowledgeCheck(firstIncomplete.id);
          return;
        }
        
        // No knowledge check or all complete: navigate to next lesson if available
        const { data: lessonsData } = await actions.fetchCourseLessons(course.id)
        if (lessonsData && Object.keys(lessonsData).length > 0) {
          const flatLessons = [];
          Object.values(lessonsData).forEach(moduleData => {
            if (moduleData.lessons && Array.isArray(moduleData.lessons)) {
              flatLessons.push(...moduleData.lessons);
            }
          });
          flatLessons.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
          const currentIndex = flatLessons.findIndex(l => l.id === lesson.id)
          const nextLesson = flatLessons[currentIndex + 1]
          if (nextLesson) {
            navigate(`/app/courses/${courseId}/lesson/${nextLesson.id}`)
          }
        }
      } catch (error) {
        showError('Failed to mark lesson as complete. Please try again.')
      } finally {
        setIsCompleting(false)
      }
    }
  }

  

  const goToPreviousLesson = async () => {
    if (course && lesson) {
      try {
        const { data: lessonsData } = await actions.fetchCourseLessons(course.id)
        if (lessonsData && Object.keys(lessonsData).length > 0) {
          // Convert grouped lessons to flat array
          const flatLessons = [];
          Object.values(lessonsData).forEach(moduleData => {
            if (moduleData.lessons && Array.isArray(moduleData.lessons)) {
              flatLessons.push(...moduleData.lessons);
            }
          });
          
          // Sort lessons by their order_index
          flatLessons.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
          
          const currentIndex = flatLessons.findIndex(l => l.id === lessonId)
          const prevLesson = flatLessons[currentIndex - 1]
          if (prevLesson) {
            navigate(`/app/courses/${courseId}/lesson/${prevLesson.id}`)
          }
        }
      } catch (error) {
        // Handle error silently or set error state if needed
      }
    }
  }

  const getContentTypeLabel = (type) => {
    switch (type) {
      case 'video': return 'Video';
      case 'text': return 'Reading';
      case 'pdf': return 'Reading';
      case 'presentation': return 'Presentation';
      case 'editor': return 'Reading';
      case 'scorm': return 'Interactive';
      case 'image': return 'Image';
      case 'ppt': return 'Presentation';
      default: return 'Lesson';
    }
  }

  // Helper function to check if URL is a valid video file
  const isValidVideoUrl = (url) => {
    if (!url) return false;
    
    // Check if it's a YouTube URL
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return false; // YouTube URLs are not direct video files
    }
    
    // Check if it's a valid HTTP/HTTPS URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return false;
    }
    
    // Check if it has a video file extension
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
    const hasVideoExtension = videoExtensions.some(ext => 
      url.toLowerCase().includes(ext)
    );
    
    return hasVideoExtension;
  };




  // Check if a quiz is completed
  const isQuizCompleted = useCallback(async (quizId) => {
    if (!user?.id || !quizId) return false;
    try {
      const { data } = await actions.fetchQuizAttempts(user.id, quizId);
      return data && data.length > 0 && data.some(attempt => attempt.completed || attempt.completed_at);
    } catch (error) {
      return false;
    }
  }, [user?.id, actions]);

  // Load quiz completion status for all quizzes
  const loadQuizCompletionStatus = useCallback(async () => {
    if (!user?.id || !quizzesByLesson) return

    const status = {}
    for (const [lessonId, quizzes] of Object.entries(quizzesByLesson)) {
      for (const quiz of quizzes) {
        try {
          const completed = await isQuizCompleted(quiz.id)
          status[quiz.id] = completed
        } catch (error) {
          status[quiz.id] = false
        }
      }
    }
    setQuizCompletionStatus(status)
  }, [user?.id, quizzesByLesson, isQuizCompleted])

  // Load quiz completion status when quizzes are loaded
  useEffect(() => {
    if (Object.keys(quizzesByLesson).length > 0) {
      loadQuizCompletionStatus()
    }
  }, [quizzesByLesson, loadQuizCompletionStatus])

  // (Removed unused getMimeTypeFromUrl)

  // Memoized helper functions
  const isYouTubeUrl = useCallback((url) => {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be');
  }, []);

  const getYouTubeVideoId = useCallback((url) => {
    if (!isYouTubeUrl(url)) return null;
    
    // Handle youtu.be format
    if (url.includes('youtu.be/')) {
      return url.split('youtu.be/')[1]?.split('?')[0];
    }
    
    // Handle youtube.com format
    if (url.includes('youtube.com/watch')) {
      const urlParams = new URLSearchParams(url.split('?')[1]);
      return urlParams.get('v');
    }
    
    return null;
  }, [isYouTubeUrl]);

  // Memoized markdown rendering functions
  const escapeHtml = useCallback((unsafe) => {
    return unsafe
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll('\'', '&#039;');
  }, []);

  const renderMarkdownToHtml = useCallback((md) => {
    const escaped = escapeHtml(md);
    let html = escaped;
    html = html.replace(/^######\s?(.*)$/gm, '<h6>$1</h6>')
               .replace(/^#####\s?(.*)$/gm, '<h5>$1</h5>')
               .replace(/^####\s?(.*)$/gm, '<h4>$1</h4>')
               .replace(/^###\s?(.*)$/gm, '<h3>$1</h3>')
               .replace(/^##\s?(.*)$/gm, '<h2>$1</h2>')
               .replace(/^#\s?(.*)$/gm, '<h1>$1</h1>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
               .replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1<\/a>');
    html = html.replace(/^(?:-\s.*(?:\n|$))+?/gm, (block) => {
      const items = block.trim().split(/\n/).map(l => l.replace(/^-\s?/, '').trim()).filter(Boolean);
      return items.length ? '<ul>' + items.map(i => `<li>${i}<\/li>`).join('') + '<\/ul>' : block;
    });
    html = html.replace(/^(?:\d+\.\s.*(?:\n|$))+?/gm, (block) => {
      const items = block.trim().split(/\n/).map(l => l.replace(/^\d+\.\s?/, '').trim()).filter(Boolean);
      return items.length ? '<ol>' + items.map(i => `<li>${i}<\/li>`).join('') + '<\/ol>' : block;
    });
    html = html.replace(/\n{2,}/g, '</p><p>');
    html = `<p>${html.replace(/\n/g, '<br/>')}<\/p>`;
    return html;
  }, [escapeHtml]);

  const parseStoredText = useCallback((raw) => {
    if (!raw) return { format: 'plaintext', text: '' };
    const match = raw.match(/^<!--content_format:(markdown|html|plaintext)-->([\s\S]*)/);
    if (match) {
      return { format: match[1], text: match[2] };
    }
    return { format: 'plaintext', text: raw };
  }, []);

  // Memoized values for the main component
  const lessonDescriptionHtml = useMemo(() => {
    // For presentation-type lessons, show the lesson description or content
    if (lesson?.content_type === 'presentation') {
      const description = lesson?.description || lesson?.content_text;
      if (description && !description.startsWith('{')) {
        // If it's not JSON data, show the description
        return <p className="text-text-light">{description}</p>;
      }
      // For presentations with JSON data, show a generic message
      return <p className="text-text-light">This lesson contains a presentation with slides.</p>;
    }
    
    const raw = lesson?.content_text || lesson?.description || '';
    if (!raw) {
      return <p className="text-text-light">No description available</p>;
    }
    
    // Check if content_text contains JSON data (split PDF data)
    if (raw.startsWith('{') && raw.includes('"images"')) {
      return <p className="text-text-light">This lesson contains split PDF content.</p>;
    }
    
    const parsed = parseStoredText(raw);
    const html = parsed.format === 'markdown'
      ? renderMarkdownToHtml(parsed.text)
      : parsed.format === 'html'
        ? parsed.text
        : `<p>${escapeHtml(parsed.text).replace(/\n/g, '<br/>')}<\/p>`;
    return (
      <div
        className="prose max-w-none text-text-light"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }, [lesson?.content_type, lesson?.content_text, lesson?.description, parseStoredText, renderMarkdownToHtml, escapeHtml]);

  const lessonContentParagraphs = useMemo(() => {
    if (!lesson?.content_text) {
      return <p className="text-text-muted">No content available for this lesson.</p>;
    }
    return lesson.content_text.split('\n\n').map((paragraph, index) => (
      <p key={index} className="mb-4">{paragraph}</p>
    ));
  }, [lesson?.content_text]);


  // Memoized LazyIframe component for performance
  const LazyIframe = memo(({ src, title, className, onLoad, onError, frameBorder, allowFullScreen }) => {
    const [ref, isIntersecting, hasIntersected] = useIntersectionObserver({
      threshold: 0.1,
      rootMargin: '50px'
    });
    const iframeRef = useRef(null);

    return (
      <div ref={ref} className={className}>
        {hasIntersected ? (
          <iframe
            ref={iframeRef}
            src={src}
            title={title}
            className="w-full h-full"
            loading="lazy"
            onLoad={onLoad}
            onError={onError}
            frameBorder={frameBorder}
            allowFullScreen={allowFullScreen}
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <div className="text-gray-500">Loading...</div>
          </div>
        )}
      </div>
    );
  });

  LazyIframe.displayName = 'LazyIframe';

  // Memoized PDF Viewer component with navigation and time tracking
  const PDFViewer = memo(({ pdfUrl, onTimeTrack }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(null);
    const [hasError, setHasError] = useState(false);
    const pdfViewStartTime = useRef(null);
    const lastSaveTime = useRef(null);
    const onTimeTrackRef = useRef(onTimeTrack);
    const isLoadedRef = useRef(false);
    const hasErrorRef = useRef(false);

    // Update refs when state changes
    useEffect(() => {
      isLoadedRef.current = isLoaded;
    }, [isLoaded]);
    
    useEffect(() => {
      hasErrorRef.current = hasError;
    }, [hasError]);

    // Update ref when onTimeTrack changes, but don't trigger effect
    useEffect(() => {
      onTimeTrackRef.current = onTimeTrack;
    }, [onTimeTrack]);

    useEffect(() => {
      setIsLoaded(false);
      setHasError(false);
      isLoadedRef.current = false;
      hasErrorRef.current = false;
      setCurrentPage(1);
      pdfViewStartTime.current = Date.now();
      lastSaveTime.current = Date.now();
      
      // Fallback timeout: if onLoad doesn't fire within 12 seconds, assume loaded
      // Increased timeout significantly to give PDF.js time to fully render entire document
      // PDFs in iframes sometimes don't fire onLoad reliably, and PDF.js needs time to render all pages
      const loadTimeout = setTimeout(() => {
        if (!isLoadedRef.current && !hasErrorRef.current) {
          // One final check - try to see if content is visible
          const iframe = document.querySelector(`iframe[title="PDF Document"]`);
          if (iframe) {
            // Give it more time if iframe exists to ensure full document render
            setTimeout(() => {
              if (!isLoadedRef.current && !hasErrorRef.current) {
                isLoadedRef.current = true;
                setIsLoaded(true);
                pdfViewStartTime.current = Date.now();
                lastSaveTime.current = Date.now();
              }
            }, 3000); // Additional 3 seconds for full render
          } else {
            // Iframe doesn't exist yet, mark as loaded anyway
            isLoadedRef.current = true;
            setIsLoaded(true);
            pdfViewStartTime.current = Date.now();
            lastSaveTime.current = Date.now();
          }
        }
      }, 12000); // Increased to 12 seconds to allow full document render
      
      // Track time when PDF is viewed
      const trackPDFTime = () => {
        if (document.visibilityState === 'visible' && pdfViewStartTime.current && lastSaveTime.current && onTimeTrackRef.current) {
          const now = Date.now();
          const timeSinceLastSave = Math.floor((now - lastSaveTime.current) / 1000);
          
          if (timeSinceLastSave >= 30) {
            onTimeTrackRef.current(timeSinceLastSave);
            lastSaveTime.current = now;
          }
        }
      };
      
      const interval = setInterval(trackPDFTime, 30000); // Check every 30 seconds
      
      return () => {
        clearTimeout(loadTimeout);
        clearInterval(interval);
        // Save final time on unmount
        if (lastSaveTime.current && document.visibilityState === 'visible' && onTimeTrackRef.current) {
          const finalTime = Math.floor((Date.now() - lastSaveTime.current) / 1000);
          if (finalTime > 0) {
            onTimeTrackRef.current(finalTime);
          }
        }
      };
    }, [pdfUrl]); // Only depend on pdfUrl

    const handleLoad = useCallback(() => {
      // Wait longer to ensure PDF.js has fully initialized and rendered all pages
      // This prevents showing partial/glitchy content as pages load incrementally
      const checkPDFReady = () => {
        const iframe = document.querySelector(`iframe[title="PDF Document"]`);
        if (iframe) {
          try {
            // Try to access iframe content to verify it's loaded
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (iframeDoc) {
              // Check if PDF.js viewer is present and initialized
              const viewer = iframeDoc.querySelector('.pdfViewer') || iframeDoc.querySelector('#viewer');
              if (viewer) {
                // Check if pages are rendered (PDF.js adds page elements)
                const pages = viewer.querySelectorAll('.page');
                if (pages.length > 0) {
                  // Pages are being rendered, wait a bit more for all pages to finish
                  // Check again after a delay to ensure all pages are rendered
                  setTimeout(() => {
                    const allPages = viewer.querySelectorAll('.page');
                    // Wait for at least 2 seconds after pages start appearing to ensure full render
                    setTimeout(() => {
                      isLoadedRef.current = true;
                      setIsLoaded(true);
                      pdfViewStartTime.current = Date.now();
                      lastSaveTime.current = Date.now();
                    }, 2000); // Additional 2 seconds for all pages to render
                  }, 1000);
                  return;
                }
              }
            }
          } catch (e) {
            // Cross-origin or other error - that's fine, just wait longer
          }
        }
        
        // Fallback: mark as loaded after a longer delay to ensure full render
        setTimeout(() => {
          isLoadedRef.current = true;
          setIsLoaded(true);
          pdfViewStartTime.current = Date.now();
          lastSaveTime.current = Date.now();
        }, 3000); // 3 second delay for full document render
      };
      
      // Initial delay to let iframe start loading, then check
      setTimeout(() => {
        requestAnimationFrame(checkPDFReady);
      }, 1000); // 1 second initial delay
    }, []);

    const handleError = useCallback(() => {
      hasErrorRef.current = true;
      isLoadedRef.current = false;
      setHasError(true);
      setIsLoaded(false);
    }, []);

    const goToNextPage = useCallback(() => {
      if (totalPages === null || currentPage < totalPages) {
        setCurrentPage(prev => prev + 1);
        // Update iframe src to navigate to next page
        const iframe = document.querySelector(`iframe[title="PDF Document"]`);
        if (iframe) {
          iframe.src = `${pdfUrl}#page=${currentPage + 1}`;
        }
      }
    }, [currentPage, totalPages, pdfUrl]);

    const goToPreviousPage = useCallback(() => {
      if (currentPage > 1) {
        setCurrentPage(prev => prev - 1);
        // Update iframe src to navigate to previous page
        const iframe = document.querySelector(`iframe[title="PDF Document"]`);
        if (iframe) {
          iframe.src = `${pdfUrl}#page=${currentPage - 1}`;
        }
      }
    }, [currentPage, pdfUrl]);

    return (
      <div className="bg-gray-50 rounded-lg p-4">
        {pdfUrl ? (
          <>
            <div className="w-full aspect-video bg-gray-50 rounded-lg overflow-hidden">
              <div className="relative w-full h-full">
                {hasError ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="text-center text-gray-500 p-8">
                      <p className="mb-4">Failed to load PDF document.</p>
                      <button
                        onClick={() => {
                          setHasError(false);
                          setIsLoaded(false);
                          setCurrentPage(1); // Reset to first page on retry
                        }}
                        className="px-4 py-2 bg-primary-default text-white rounded-lg hover:bg-primary-dark transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                <LazyIframe
                      key={`${pdfUrl}-${currentPage}`}
                  src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1&view=FitH&page=${currentPage}`}
                  title="PDF Document"
                  className={`w-full h-full transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                  onLoad={handleLoad}
                      onError={handleError}
                  frameBorder="0"
                />
                    {!isLoaded && !hasError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[rgba(6,17,48,0.96)] z-10">
                    <div className="flex flex-col items-center gap-3 text-white">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#FF8F3F]"></div>
                      <p className="text-xs font-medium tracking-wide text-[#FFCB9E] uppercase">Loading document…</p>
                      <p className="text-xs text-gray-400 mt-2">Please wait while the document renders</p>
                    </div>
                  </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center text-gray-500 p-8">No PDF available.</div>
        )}
      </div>
    );
  });

  PDFViewer.displayName = 'PDFViewer';

  // Memoized PPT Viewer component
  const PPTViewer = memo(({ pptUrl, onLoad }) => {
    const [error, setError] = useState(null);
    const [isLoaded, setIsLoaded] = useState(false);
    
    useEffect(() => {
      setIsLoaded(false);
      setError(null);
    }, [pptUrl]);

    const isGoogleSlides = useMemo(() => {
      return /docs\.google\.com\/presentation\/d\/[a-zA-Z0-9_-]+/i.test(pptUrl);
    }, [pptUrl]);

    const embedUrl = useMemo(() => {
      if (!pptUrl) return null;
      
      if (isGoogleSlides) {
        const presentationId = pptUrl.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
        return presentationId 
          ? `https://docs.google.com/presentation/d/${presentationId}/embed`
          : pptUrl;
      } else {
        // Ensure URL is publicly accessible - Office Online Viewer requires this
        let publicUrl = pptUrl;
        // If it's a Supabase storage path, ensure it's a public URL
        if (pptUrl.includes('supabase.co/storage/v1/object/public/')) {
          publicUrl = pptUrl;
        } else if (pptUrl.includes('supabase.co') && !pptUrl.includes('/public/')) {
          // Try to construct public URL
          const pathMatch = pptUrl.match(/storage\/v1\/object\/[^\/]+\/(.+)/);
          if (pathMatch) {
            publicUrl = pptUrl.replace(/\/storage\/v1\/object\/[^\/]+\//, '/storage/v1/object/public/');
          }
        }
        return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(publicUrl)}`;
      }
    }, [pptUrl, isGoogleSlides]);

    const handleLoad = useCallback(() => {
      setIsLoaded(true);
      if (typeof onLoad === 'function') {
        onLoad();
      }
    }, [onLoad]);

    return (
      <div className="bg-gray-50 rounded-lg p-4">
        {pptUrl ? (
          <div className="w-full aspect-video bg-gray-100 rounded-lg overflow-hidden">
            <div className="relative w-full h-full">
              {embedUrl ? (
                <iframe
                  key={embedUrl}
                  src={embedUrl}
                  title="Presentation"
                  className={`w-full h-full transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                  frameBorder="0"
                  allowFullScreen
                  onLoad={handleLoad}
                  onError={() => setError('Unable to load presentation. Please try again later.')}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-gray-500 text-sm">Preparing preview…</div>
                </div>
              )}
              {(!isLoaded || !embedUrl) && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-[rgba(6,17,48,0.96)]">
                  <div className="flex flex-col items-center gap-3 text-white">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#FF8F3F]"></div>
                    <p className="text-xs font-medium tracking-wide text-[#FFCB9E] uppercase">Loading presentation…</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 p-8">No presentation available.</div>
        )}
        {pptUrl && (
          <div className="mt-3 flex justify-end">
            <ActionButton action="view" variant="secondary" onClick={() => window.open(pptUrl, '_blank')}>
              Open in new tab
            </ActionButton>
          </div>
        )}
        {error && (
          <div className="mt-4 text-sm text-error-default">{error}</div>
        )}
      </div>
    );
  });

  PPTViewer.displayName = 'PPTViewer';

  // Memoized Text Content component
  const TextContentViewer = memo(({ contentText }) => {
    const parsed = useMemo(() => parseStoredText(contentText), [contentText, parseStoredText]);
    
    const html = useMemo(() => {
      return parsed.format === 'markdown'
        ? renderMarkdownToHtml(parsed.text)
        : parsed.format === 'html'
          ? parsed.text
          : `<p>${escapeHtml(parsed.text).replace(/\n/g, '<br/>')}<\/p>`;
    }, [parsed, renderMarkdownToHtml, escapeHtml]);

    return (
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="w-full aspect-video bg-gray-50 rounded-lg overflow-hidden">
          <div className="w-full h-full p-4 overflow-y-auto">
            <div
              className="prose max-w-none text-text-medium"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </div>
      </div>
    );
  });

  TextContentViewer.displayName = 'TextContentViewer';

  // Memoized Image Viewer component
  const ImageViewer = memo(({ imageUrl, textContent, audioUrl, contentFormat }) => {
    return (
      <div className="space-y-6">
        {imageUrl ? (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="w-full bg-gray-50 rounded-lg overflow-hidden">
              <div className="w-full flex items-center justify-center p-4">
                <img
                  src={imageUrl}
                  alt="Lesson Image"
                  className="max-w-full max-h-[600px] object-contain rounded-lg shadow-sm"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const errorDiv = e.target.nextElementSibling;
                    if (errorDiv) errorDiv.style.display = 'block';
                  }}
                />
                <div 
                  className="hidden text-center text-gray-500"
                  style={{ display: 'none' }}
                >
                  <div className="text-gray-500 text-lg mb-4">Failed to load image</div>
                  <p className="text-sm">The image could not be displayed.</p>
                </div>
              </div>
              <div className="mt-3 flex justify-center">
                <Button variant="secondary" onClick={() => window.open(imageUrl, '_blank')}>
                  Open in new tab
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 p-8">No image available.</div>
        )}

        {/* Text Content */}
        {textContent && (
          <Card className="p-6">
            <div className="prose max-w-none">
              {contentFormat === 'html' ? (
                <div dangerouslySetInnerHTML={{ __html: textContent }} />
              ) : contentFormat === 'markdown' ? (
                <div className="whitespace-pre-wrap">{textContent}</div>
              ) : (
                <div className="whitespace-pre-wrap">{textContent}</div>
              )}
            </div>
          </Card>
        )}

        {/* Audio Narration */}
        {audioUrl && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-text-dark mb-4">Audio Narration</h3>
            <AudioPlayer audioUrl={audioUrl} />
          </Card>
        )}
      </div>
    );
  });

  ImageViewer.displayName = 'ImageViewer';

  // Memoized Audio Player component
  // AudioPlayer is now defined at module level above

  // PresentationWrapper is now defined at module level above

  // KnowledgeCheckCard is now defined at module level above

  const handleKnowledgeCheckSubmit = useCallback(
    async (quizData, submittedAnswers, summary) => {
      if (!quizData?.id) return;
      const normalizedSummary = (() => {
        const maxScore =
          summary?.maxScore && summary.maxScore > 0
            ? summary.maxScore
            : Math.max(summary?.breakdown?.length || 0, 1);
        return { ...summary, maxScore };
      })();

      if (user?.id) {
        try {
          await actions.submitQuizAttempt(
            user.id,
            quizData.id,
            submittedAnswers,
            normalizedSummary.score,
            normalizedSummary.maxScore
          );
        } catch (_) {
          // Ignore errors for inline checks; user-facing feedback handled in component
        }
      }

      setKnowledgeCheckResults(prev => ({
        ...prev,
        [quizData.id]: { ...normalizedSummary, answers: submittedAnswers },
      }));

      setQuizCompletionStatus(prev => ({
        ...prev,
        [quizData.id]: true,
      }));
    },
    [actions, user?.id]
  );

  const handleKnowledgeCheckReset = useCallback((quizId) => {
    setKnowledgeCheckResults(prev => {
      const { [quizId]: _removed, ...rest } = prev;
      return rest;
    });
    setQuizCompletionStatus(prev => ({
      ...prev,
      [quizId]: false,
    }));
  }, []);

  // Editor Content Viewer - renders content blocks from the editor
  const EditorContentViewer = memo(({ blocks }) => {
    const [currentPageIndex, setCurrentPageIndex] = useState(0);

    // Split blocks into pages based on page_break blocks
    const pages = useMemo(() => {
      if (!blocks || blocks.length === 0) return [];

      const pagesList = [];
      let currentPage = {
        blocks: [],
        backgroundColor: '#ffffff',
        showPageNumber: true,
      };

      blocks.forEach((block) => {
        if (block.type === 'page_break') {
          // Save current page and start new one
          if (currentPage.blocks.length > 0 || pagesList.length === 0) {
            pagesList.push(currentPage);
          }
          currentPage = {
            blocks: [],
            backgroundColor: block.data?.backgroundColor || '#ffffff',
            showPageNumber: block.data?.showPageNumber !== false,
          };
        } else {
          currentPage.blocks.push(block);
        }
      });

      // Add the last page
      if (currentPage.blocks.length > 0 || pagesList.length === 0) {
        pagesList.push(currentPage);
      }

      return pagesList;
    }, [blocks]);

    if (!blocks || blocks.length === 0) {
      return (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-500">No content blocks in this lesson yet.</p>
        </div>
      );
    }

    const currentPage = pages[currentPageIndex] || { blocks: [], backgroundColor: '#ffffff', showPageNumber: true };

    const handleNextPage = () => {
      if (currentPageIndex < pages.length - 1) {
        setCurrentPageIndex(currentPageIndex + 1);
      }
    };

    const handlePrevPage = () => {
      if (currentPageIndex > 0) {
        setCurrentPageIndex(currentPageIndex - 1);
      }
    };

    return (
      <div className="space-y-4">
        {/* Page Navigation */}
        {pages.length > 1 && (
          <div className="flex items-center justify-between bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <button
              onClick={handlePrevPage}
              disabled={currentPageIndex === 0}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <span className="text-sm font-medium text-gray-700">
              Page {currentPageIndex + 1} of {pages.length}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPageIndex === pages.length - 1}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Page Content */}
        <div 
          className="rounded-lg p-8 shadow-lg min-h-[600px] relative"
          style={{ backgroundColor: currentPage.backgroundColor }}
        >
          <div className="max-w-4xl mx-auto space-y-6">
            {currentPage.blocks.map((block, index) => {
            // Text Block
            if (block.type === 'text') {
              return (
                <div
                  key={block.id || index}
                  className="prose max-w-none"
                  style={{
                    fontSize: `${block.data?.fontSize || 16}px`,
                    fontFamily: block.data?.fontFamily || 'Inter',
                    color: block.data?.color || '#000000',
                    textAlign: block.data?.alignment || 'left',
                  }}
                  dangerouslySetInnerHTML={{ __html: block.data?.content || '<p>Empty text block</p>' }}
                />
              );
            }

            // Heading Block
            if (block.type === 'heading') {
              const HeadingTag = `h${block.data?.level || 2}`;
              return (
                <HeadingTag
                  key={block.id || index}
                  style={{
                    color: block.data?.color || '#000000',
                    textAlign: block.data?.alignment || 'left',
                  }}
                  className="font-bold"
                >
                  {block.data?.text || 'Heading'}
                </HeadingTag>
              );
            }

            // Image Block
            if (block.type === 'image' && block.data?.src) {
              return (
                <figure key={block.id || index} className="my-6">
                  <img
                    src={block.data.src}
                    alt={block.data.alt || ''}
                    style={{
                      width: block.data.width || '100%',
                      height: block.data.height || 'auto',
                      objectFit: block.data.objectFit || 'contain',
                    }}
                    className="rounded-lg"
                  />
                  {block.data.caption && (
                    <figcaption className="text-sm text-gray-600 text-center mt-2">
                      {block.data.caption}
                    </figcaption>
                  )}
                </figure>
              );
            }

            // Video Block
            if (block.type === 'video' && block.data?.src) {
              // YouTube
              if (block.data.type === 'youtube') {
                const videoId = block.data.src.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
                if (videoId) {
                  return (
                    <div
                      key={block.id || index}
                      className="my-6"
                      style={{
                        width: block.data.width || '100%',
                        height: block.data.height || '400px',
                      }}
                    >
                      <iframe
                        src={`https://www.youtube.com/embed/${videoId}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full rounded-lg"
                      />
                    </div>
                  );
                }
              }

              // Vimeo
              if (block.data.type === 'vimeo') {
                const videoId = block.data.src.match(/vimeo\.com\/(\d+)/)?.[1];
                if (videoId) {
                  return (
                    <div
                      key={block.id || index}
                      className="my-6"
                      style={{
                        width: block.data.width || '100%',
                        height: block.data.height || '400px',
                      }}
                    >
                      <iframe
                        src={`https://player.vimeo.com/video/${videoId}`}
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full rounded-lg"
                      />
                    </div>
                  );
                }
              }

              // HTML5 Video
              return (
                <div key={block.id || index} className="my-6">
                  <video
                    src={block.data.src}
                    controls={block.data.controls !== false}
                    autoPlay={block.data.autoplay}
                    loop={block.data.loop}
                    muted={block.data.muted}
                    style={{
                      width: block.data.width || '100%',
                      height: block.data.height || '400px',
                    }}
                    className="rounded-lg"
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              );
            }

            // Embed Block (iframe or HTML)
            if (block.type === 'embed') {
              // Handle iframe embeds
              if (block.data.type === 'iframe' && block.data.src) {
                return (
                  <div key={block.id || index} className="my-6">
                    <div className="relative" style={{ width: block.data.width || '100%', height: block.data.height || '400px' }}>
                      <iframe
                        src={block.data.src}
                        style={{
                          width: '100%',
                          height: '100%',
                        }}
                        className="border border-gray-300 rounded-lg"
                        title={block.data.title || 'Embedded content'}
                        allowFullScreen
                      />
                    </div>
                  </div>
                );
              }

              // Handle HTML embeds
              if (block.data.type === 'html' && block.data.embedCode) {
                return (
                  <div key={block.id || index} className="my-6">
                    <div
                      dangerouslySetInnerHTML={{ __html: block.data.embedCode }}
                      className="rounded-lg overflow-hidden"
                    />
                  </div>
                );
              }

              // Auto-detect and handle src without explicit type
              if (block.data.src && !block.data.type) {
                return (
                  <div key={block.id || index} className="my-6">
                    <div className="relative" style={{ width: block.data.width || '100%', height: block.data.height || '400px' }}>
                      <iframe
                        src={block.data.src}
                        style={{
                          width: '100%',
                          height: '100%',
                        }}
                        className="border border-gray-300 rounded-lg"
                        title={block.data.title || 'Embedded content'}
                        allowFullScreen
                      />
                    </div>
                  </div>
                );
              }
            }

            // Quiz Block
            if (block.type === 'quiz') {
              return (
                <div key={block.id || index} className="my-6">
                  <div className="border border-gray-200 rounded-lg overflow-hidden shadow-md">
                    {/* Quiz header */}
                    <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-4">
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                          <path d="M9 11l3 3L22 4"></path>
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                        </svg>
                        <div>
                          <h3 className="text-lg font-semibold">{block.data?.title || 'Quiz'}</h3>
                          {block.data?.passThreshold && (
                            <p className="text-sm text-primary-100">
                              Pass threshold: {block.data.passThreshold}%
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quiz content */}
                    <div className="p-6 bg-white">
                      {block.data?.quizId ? (
                        <div className="text-center py-8">
                          <p className="text-gray-600 mb-4">
                            Ready to test your knowledge?
                          </p>
                          <p className="text-sm text-gray-500 mb-6">
                            Quiz ID: <span className="font-mono font-semibold">{block.data.quizId}</span>
                          </p>
                          <button 
                            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium shadow-sm hover:shadow-md"
                            onClick={() => {
                              // Navigate to quiz view
                              navigate(`/app/courses/${courseId}/quiz/${block.data.quizId}`);
                            }}
                          >
                            Start Quiz
                          </button>
                          {block.data?.allowRetakes && (
                            <p className="text-xs text-gray-500 mt-3">
                              You can retake this quiz multiple times
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 bg-blue-50 rounded-lg">
                          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-blue-400 mb-4">
                            <path d="M9 11l3 3L22 4"></path>
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                          </svg>
                          <p className="text-blue-700 text-sm font-medium">No quiz configured</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            // Code Block
            if (block.type === 'code') {
              const theme = block.data?.theme || 'dark';
              const isDark = theme === 'dark';
              
              return (
                <div key={block.id || index} className="my-6">
                  <div className={`rounded-lg overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
                    {/* Header with language and copy button */}
                    <div className={`flex items-center justify-between px-4 py-2 border-b ${
                      isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-gray-200'
                    }`}>
                      <span className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {block.data?.language || 'code'}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(block.data?.code || '');
                        }}
                        className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                          isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        Copy
                      </button>
                    </div>

                    {/* Code content */}
                    <pre className={`p-4 overflow-x-auto ${block.data?.lineNumbers ? 'pl-12' : ''} ${
                      isDark ? 'text-gray-100' : 'text-gray-900'
                    }`}>
                      <code 
                        className="text-sm font-mono"
                        style={{
                          fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                          lineHeight: '1.6',
                        }}
                      >
                        {block.data?.code || block.data?.content || '// Empty code block'}
                      </code>
                    </pre>
                  </div>
                </div>
              );
            }

            // Unknown block type
            return (
              <div key={block.id || index} className="p-4 bg-gray-100 rounded border border-gray-300">
                <p className="text-sm text-gray-500">
                  Unsupported block type: {block.type}
                </p>
              </div>
            );
          })}
          </div>

          {/* Page number */}
          {currentPage.showPageNumber && pages.length > 1 && (
            <div className="absolute bottom-4 right-4 text-xs text-gray-400 font-medium">
              {currentPageIndex + 1}
            </div>
          )}
        </div>
      </div>
    );
  });

  EditorContentViewer.displayName = 'EditorContentViewer';

  const VideoPlayer = memo(({ lesson: lessonProp }) => {
    if (!lessonProp) return null
    const displayLesson = lessonProp
    
    if (displayLesson.content_type !== 'video') {
      // Handle text rendering with stored format marker
      if (displayLesson.content_type === 'text') {
        return <TextContentViewer contentText={displayLesson.content_text} />;
      }
      // Handle PDF rendering
      if (displayLesson.content_type === 'pdf') {
        return <PDFViewer pdfUrl={displayLesson.content_url} onTimeTrack={saveProgress} />;
      }
      // Handle PPT rendering
      if (displayLesson.content_type === 'ppt') {
        return <PPTViewer pptUrl={displayLesson.content_url} />;
      }
      // Handle image rendering
      if (displayLesson.content_type === 'image') {
        return (
          <ImageViewer 
            imageUrl={displayLesson.content_url} 
            textContent={displayLesson.content_text}
            audioUrl={displayLesson.audio_attachment_url}
            contentFormat={displayLesson.content_format}
          />
        );
      }

      // Handle presentation rendering
      if (displayLesson.content_type === 'presentation') {
        return (
          <PresentationWrapper
            lessonId={displayLesson.id}
            lesson={lesson}
            userId={user?.id}
            isCompleted={isCompleted}
            onPresentationComplete={() => setIsCompleted(true)}
            onMarkComplete={markAsCompleted}
            onPreviousLesson={goToPreviousLesson}
            onNextLesson={goToNextLesson}
            hasPreviousLesson={lessons.findIndex(l => l.id === lessonId) > 0}
            hasNextLesson={lessons.findIndex(l => l.id === lessonId) < lessons.length - 1}
          />
        );
      }

      // Handle editor-created content with content_blocks
      if (displayLesson.content_type === 'editor' && displayLesson.content_blocks && Array.isArray(displayLesson.content_blocks)) {
        return <EditorContentViewer blocks={displayLesson.content_blocks} />;
      }

      // Fallback placeholder for other non-video content types
      return (
        <div className="bg-gray-100 rounded-lg p-8 text-center">
          <div className="text-gray-500 text-lg mb-4">Content not available</div>
          <p className="text-sm text-gray-400">
            Content type: {displayLesson.content_type || 'Unknown'}
          </p>
        </div>
      );
    }

    // Check if it's a YouTube URL → render iframe embed
    if (isYouTubeUrl(displayLesson.content_url)) {
      const videoId = getYouTubeVideoId(displayLesson.content_url);
      if (!videoId) {
        return (
          <div className="bg-gray-100 rounded-lg p-8 text-center">
            <div className="text-gray-500 text-lg mb-4">Invalid YouTube URL</div>
            <div className="bg-white p-6 rounded-lg border break-all">{displayLesson.content_url}</div>
          </div>
        );
      }
      const embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0`;
      return (
        <div className="w-full">
          <div className="w-full aspect-video bg-gray-50 rounded-lg overflow-hidden">
            <iframe
              src={embedUrl}
              title="YouTube video player"
              className="w-full h-full rounded-lg"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              loading="lazy"
              allowFullScreen
            />
          </div>
        </div>
      );
    }

    // Check if it's a valid direct video URL
    if (!isValidVideoUrl(displayLesson.content_url)) {
      return (
        <div className="bg-gray-100 rounded-lg p-8 text-center">
          <div className="text-gray-500 text-lg mb-4">
            Invalid Video URL
          </div>
          <div className="bg-white p-6 rounded-lg border">
            <p className="text-gray-700 mb-4">
              The provided URL is not a valid video file. Please provide a direct link to a video file (e.g., .mp4, .webm).
            </p>
            <div className="text-sm text-gray-500 break-all">
              Current URL: {displayLesson.content_url}
            </div>
            {displayLesson.content_url?.toLowerCase().endsWith('.mov') && (
              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3 mt-3 text-left">
                This appears to be a .mov file. Web playback for MOV is unreliable across browsers/CDNs. Please convert to MP4 (H.264 + AAC) before upload for best compatibility.
              </div>
            )}
          </div>
        </div>
      );
    }

    // Valid video URL - render ReactPlayer for robust playback
    return (
      <div className="w-full aspect-video bg-gray-50 rounded-lg overflow-hidden relative">
        <ReactPlayer
          key={playerKey}
          ref={playerRef}
          url={haltVideo ? undefined : displayLesson.content_url}
          controls
          width="100%"
          height="100%"
          playsInline
          config={{ file: { attributes: { preload: 'metadata' } } }}
          onReady={() => {
            videoReadyRef.current = true;
            setVideoLoading(false);
            if (videoTimeoutRef.current) {
              clearTimeout(videoTimeoutRef.current);
              videoTimeoutRef.current = null;
            }
          }}
          onStart={() => {
            videoReadyRef.current = true;
            setVideoLoading(false);
            if (videoTimeoutRef.current) {
              clearTimeout(videoTimeoutRef.current);
              videoTimeoutRef.current = null;
            }
          }}
          onWaiting={() => setVideoLoading(true)}
          onPlaying={() => {
            videoReadyRef.current = true;
            setVideoLoading(false);
            if (videoTimeoutRef.current) {
              clearTimeout(videoTimeoutRef.current);
              videoTimeoutRef.current = null;
            }
          }}
          onError={() => {
            setVideoLoading(false);
            setHaltVideo(true);
            setVideoError({
              error: null,
              errorCode: 'UNKNOWN',
              errorMessage: 'Video playback error occurred. Please try again.',
              src: displayLesson.content_url
            });
            if (videoTimeoutRef.current) {
              clearTimeout(videoTimeoutRef.current);
              videoTimeoutRef.current = null;
            }
          }}
          onProgress={({ playedSeconds }) => {
            const t = playedSeconds || 0;
            setCurrentTime(t);
          }}
          onEnded={() => {
            if (!isCompleted) {
              markAsCompleted();
            }
          }}
        />
        {videoLoading && (
          <div className="absolute inset-0 rounded-lg flex items-center justify-center bg-[rgba(6,17,48,0.94)]">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF8F3F] mx-auto mb-4"></div>
              <div className="tracking-wide text-sm uppercase text-[#FFCB9E]">Loading video...</div>
            </div>
          </div>
        )}
      </div>
    );
  });

  VideoPlayer.displayName = 'VideoPlayer';

  // Video Error Display Component
  const VideoErrorDisplay = memo(() => {
    if (!videoError) return null;
    
    const getErrorMessage = () => {
      if (videoError.errorCode === 'TIMEOUT') {
        return 'Video playback timed out. Please check your connection and try again.';
      }
      
      switch (videoError.errorCode) {
        case 1:
          return 'Video playback was aborted.';
        case 2:
          return 'Network error occurred while loading video.';
        case 3:
          return 'Video decoding error occurred.';
        case 4:
          return 'Video format is not supported.';
        default:
          return videoError.errorMessage || 'Unknown video error occurred.';
      }
    };
    
    return (
      <Card className="p-6 bg-red-50 border-red-200">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <Play className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Video Playback Error</h3>
            <p className="text-red-700 mb-3">{getErrorMessage()}</p>
            <div className="text-sm text-red-600 mb-4">
              <p><strong>URL:</strong> {videoError.src}</p>
              <p><strong>Error Code:</strong> {videoError.errorCode}</p>
              {videoError.errorMessage && (
                <p><strong>Message:</strong> {videoError.errorMessage}</p>
              )}
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setVideoError(null);
                  setHaltVideo(false);
                  setVideoLoading(true);
                  setPlayerKey((k) => k + 1);
                }}
              >
                Retry Loading
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setHaltVideo(true);
                  setVideoLoading(false);
                }}
              >
                Stop Loading
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  if (videoError.src) {
                    window.open(videoError.src, '_blank');
                  }
                }}
              >
                Open in New Tab
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  });

  VideoErrorDisplay.displayName = 'VideoErrorDisplay';

  // Show loading only if we don't have previous data to display
  const showFullLoading = loading && !displayLesson && !displayCourse

  if (showFullLoading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!displayLesson || !displayCourse) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-text-dark mb-4">Lesson Not Found</h2>
        <p className="text-text-light mb-6">The lesson you're looking for doesn't exist or has been removed.</p>
        <ActionButton action="previous" onClick={() => navigate(`/app/courses/${courseId}`)}>
          Back to Course
        </ActionButton>
      </div>
    )
  }
  
  // Use displayLesson and displayCourse for rendering to prevent flicker
  const currentLesson = displayLesson
  const currentCourse = displayCourse

  const currentLessonIndex = lessons.findIndex(lessonEntry => lessonEntry.id === lessonId);
  const isLastLesson = currentLessonIndex !== -1 && currentLessonIndex === lessons.length - 1;

  return (
    <div className="flex flex-col h-screen bg-background-default">
      {loading && displayLesson && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-[60] flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-lg shadow-lg p-4 flex items-center gap-3">
            <LoadingSpinner size="sm" />
            <span className="text-sm text-text-medium">Loading lesson...</span>
          </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between h-14 px-4 sm:px-6 bg-white border-b border-background-dark">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(`/app/courses/${courseId}`)}
              className="flex items-center gap-2 text-sm font-medium text-text-dark hover:text-primary-default transition-colors"
            >
              <ChevronLeft className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate max-w-[200px]">{currentCourse.title}</span>
              <span className="sm:hidden">Back</span>
            </button>
            {isCourseCompleted && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium flex-shrink-0">
                <BookOpen className="w-3 h-3" />
                Review Mode
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={`/app/courses/${courseId}?tab=community`}
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-primary-default hover:text-primary-dark px-2 py-1 rounded-md hover:bg-background-light"
            >
              <MessageCircle className="w-4 h-4" />
              Community
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? 'Show course outline' : 'Hide course outline'}
            >
              {sidebarCollapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <div className="w-full bg-background-medium h-1">
          <div
            className="bg-primary-default h-1 transition-all duration-500"
            style={{ width: `${courseProgressData.percentage}%` }}
          />
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile sidebar backdrop */}
        {!sidebarCollapsed && (
          <div className="lg:hidden fixed inset-0 bg-black/20 z-20" onClick={() => setSidebarCollapsed(true)} />
        )}

        {/* Right Sidebar - Course Navigation */}
        {!sidebarCollapsed && (
          <aside className="absolute top-0 bottom-0 right-0 z-30 lg:relative lg:z-auto lg:order-last flex flex-col w-80 flex-shrink-0 border-l border-background-dark bg-white overflow-hidden shadow-lg lg:shadow-none">
            <div className="p-4 border-b border-background-dark flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-light">Course Content</span>
                <span className="text-xs text-text-light">
                  {courseProgressData.completedCount}/{courseProgressData.totalCount}
                </span>
              </div>
              {courseProgressData.percentage === 100 && canAccessCertificates(displayCourse) && (
                <Button
                  onClick={() => setShowCertificateModal(true)}
                  className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  <Award className="w-3.5 h-3.5 mr-1.5" />
                  View Certificate
                </Button>
              )}
              {courseProgressData.percentage === 100 && !canAccessCertificates(displayCourse) && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-center">
                  <p className="text-xs text-amber-800">
                    Certificates are available with a paid plan.
                  </p>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {(() => {
                const combinedItems = [];
                let itemIndex = 0;

                lessons.forEach((courseLesson) => {
                  combinedItems.push({ type: 'lesson', data: courseLesson, index: itemIndex++ });
                  if (Array.isArray(quizzesByLesson[courseLesson.id]) && quizzesByLesson[courseLesson.id].length > 0) {
                    quizzesByLesson[courseLesson.id].forEach((qz) => {
                      combinedItems.push({ type: 'quiz', data: qz, lessonId: courseLesson.id, index: itemIndex++ });
                    });
                  }
                });

                if (courseFinalAssessment && canAccessAssessments(displayCourse)) {
                  combinedItems.push({ type: 'finalAssessment', data: courseFinalAssessment, index: itemIndex++ });
                }

                return combinedItems.map((item) => {
                  if (item.type === 'lesson') {
                    const courseLesson = item.data;
                    const isCurrentLesson = courseLesson.id === lessonId;
                    const isLessonCompleted = courseProgress[courseId]?.[courseLesson.id]?.completed;
                    const targetIdx = lessons.findIndex(l => l.id === courseLesson.id);
                    const currentIdx = lessons.findIndex(l => l.id === lessonId);
                    const isLocked = !isCourseCompleted && targetIdx > currentIdx && !timeRequirementMet;

                    return (
                      <button
                        key={courseLesson.id}
                        onClick={() => {
                          if (isLocked) {
                            if (timeRemainingInfo) {
                              showError(`Please review the current lesson for at least ${timeRemainingInfo.totalMinutesRequired} minute${timeRemainingInfo.totalMinutesRequired !== 1 ? 's' : ''} before proceeding.`);
                            } else {
                              showError('Please complete the current lesson before proceeding.');
                            }
                            return;
                          }
                          navigate(`/app/courses/${courseId}/lesson/${courseLesson.id}`);
                        }}
                        disabled={isLocked}
                        className={`w-full text-left px-4 py-3 flex items-start gap-3 border-l-[3px] transition-colors ${
                          isCurrentLesson
                            ? 'border-l-primary-default bg-primary-superlight'
                            : 'border-l-transparent hover:bg-background-light'
                        } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {isLessonCompleted ? (
                            <CheckCircle className="w-5 h-5 text-success-default" />
                          ) : isCurrentLesson ? (
                            <Play className="w-5 h-5 text-primary-default" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-background-dark flex items-center justify-center">
                              <span className="text-[10px] text-text-light">{item.index + 1}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm leading-tight ${isCurrentLesson ? 'font-semibold text-primary-default' : 'font-medium text-text-dark'}`}>
                            {courseLesson.title}
                          </h4>
                          <p className="text-xs text-text-light mt-0.5">
                            {getContentTypeLabel(courseLesson.content_type)}
                            {courseLesson.duration_minutes ? ` \u2022 ${courseLesson.duration_minutes} min` : ''}
                          </p>
                        </div>
                      </button>
                    );
                  }

                  if (item.type === 'quiz') {
                    const qz = item.data;
                    const isKnowledgeCheck = qz.quiz_type === 'non_graded';
                    const isQzCompleted = quizCompletionStatus[qz.id] || false;
                    const isCurrentQuiz = !isKnowledgeCheck && location.pathname.includes(`/quiz/${qz.id}`);
                    const isActiveKC = isKnowledgeCheck && lessonId === item.lessonId && activeKnowledgeCheckId === qz.id;

                    const handleQuizClick = () => {
                      if (isKnowledgeCheck) {
                        if (item.lessonId !== lessonId) {
                          navigate(`/app/courses/${courseId}/lesson/${item.lessonId}?knowledgeCheck=${qz.id}`);
                          return;
                        }
                        const nextParams = new URLSearchParams(searchParams);
                        nextParams.set('knowledgeCheck', qz.id);
                        setSearchParams(nextParams, { replace: true });
                        setActiveKnowledgeCheckId(qz.id);
                        return;
                      }
                      navigate(`/app/courses/${courseId}/quiz/${qz.id}`);
                    };

                    return (
                      <button
                        key={`quiz-${qz.id}`}
                        onClick={handleQuizClick}
                        className={`w-full text-left px-4 py-3 flex items-start gap-3 border-l-[3px] transition-colors ${
                          isActiveKC || isCurrentQuiz
                            ? 'border-l-primary-default bg-primary-superlight'
                            : 'border-l-transparent hover:bg-background-light'
                        }`}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {isQzCompleted ? (
                            <CheckCircle className="w-5 h-5 text-success-default" />
                          ) : (isActiveKC || isCurrentQuiz) ? (
                            <Play className="w-5 h-5 text-primary-default" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-background-dark flex items-center justify-center">
                              <span className="text-[10px] text-text-light">{item.index + 1}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium leading-tight">
                            <span className="text-primary-default">{isKnowledgeCheck ? 'Knowledge Check:' : 'Quiz:'}</span>{' '}
                            {qz.title}
                          </h4>
                          <p className="text-xs text-text-light mt-0.5">
                            {isKnowledgeCheck
                              ? `${qz.question_count || 0} question${(qz.question_count || 0) !== 1 ? 's' : ''}`
                              : `${qz.time_limit_minutes ? `${qz.time_limit_minutes} min` : 'No time limit'} \u2022 ${qz.question_count || 0} questions`}
                          </p>
                        </div>
                      </button>
                    );
                  }

                  if (item.type === 'finalAssessment') {
                    const finalAssessment = item.data;
                    const isFACompleted = finalAssessmentCompleted || false;
                    const isCurrentFA = location.pathname.includes(`/quiz/${finalAssessment.id}`);

                    return (
                      <button
                        key={`final-${finalAssessment.id}`}
                        onClick={() => navigate(`/app/courses/${courseId}/quiz/${finalAssessment.id}`)}
                        className={`w-full text-left px-4 py-3 flex items-start gap-3 border-l-[3px] border-t border-background-dark mt-1 transition-colors ${
                          isCurrentFA ? 'border-l-primary-default bg-primary-superlight' : 'border-l-transparent hover:bg-background-light'
                        }`}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {isFACompleted ? (
                            <CheckCircle className="w-5 h-5 text-success-default" />
                          ) : isCurrentFA ? (
                            <Play className="w-5 h-5 text-primary-default" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-primary-default flex items-center justify-center">
                              <span className="text-[10px] font-bold">{item.index + 1}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold leading-tight">
                            <span className="text-primary-default">Final Assessment:</span>{' '}
                            {finalAssessment.title}
                          </h4>
                          <p className="text-xs text-text-light mt-0.5">
                            {finalAssessment.time_limit_minutes ? `${finalAssessment.time_limit_minutes} min` : 'No time limit'} &bull; {finalAssessment.question_count || 0} questions
                          </p>
                        </div>
                      </button>
                    );
                  }

                  return null;
                });
              })()}
            </div>
          </aside>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className={`w-full ${currentLesson.content_type === 'video' ? 'bg-[#1c1d1f]' : 'bg-background-light'}`}>
            <div className="max-w-5xl mx-auto">
              {currentLesson.content_type === 'scorm' ? (
                <div className="w-full min-h-[400px]">
                  <ScormPlayer
                    scormUrl={currentLesson.content_url}
                    lessonId={currentLesson.id}
                    courseId={courseId}
                    onProgress={() => {}}
                    onComplete={() => setIsCompleted(true)}
                    onError={() => showError('Failed to load SCORM content')}
                  />
                </div>
              ) : (
                <VideoPlayer lesson={currentLesson} />
              )}
            </div>
          </div>

          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-1">
            <div className="flex items-start justify-between gap-4 mb-1">
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wider text-text-light mb-1">
                  {currentLesson?.module?.title || currentCourse.title}
                </p>
                <PageTitle
                  title={currentLesson.title}
                  className="space-y-0"
                  titleClassName="!pb-2"
                />
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="inline-flex items-center gap-1.5 text-text-light text-xs">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="font-mono tabular-nums">{formatElapsedTime(elapsedSeconds)}</span>
                  </div>
                  {timeRemainingInfo && !timeRequirementMet && (
                    <div className="inline-flex items-center gap-1.5 text-warning-default text-xs font-medium">
                      <span className="font-mono tabular-nums">{formatElapsedTime(timeRemainingInfo.timeRemaining)}</span>
                      <span>remaining</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0 mt-1">
                {!isCompleted ? (
                  <Button onClick={markAsCompleted} disabled={isCompleting} size="sm">
                    {isCompleting ? 'Completing...' : 'Mark Complete'}
                  </Button>
                ) : (
                  <div className="inline-flex items-center gap-1.5 text-success-default bg-success-light px-3 py-1.5 rounded-lg text-sm font-medium">
                    <CheckCircle className="w-4 h-4" />
                    Completed
                  </div>
                )}
              </div>
            </div>

            {timeRemainingInfo && !timeRequirementMet && (
              <div className="flex items-center justify-between gap-3 bg-warning-light px-3 py-2 rounded-lg mt-3">
                <div className="flex items-center gap-2 text-warning-default">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">
                    Review this lesson for at least {timeRemainingInfo.totalMinutesRequired} min before proceeding
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-warning-default/20 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-1.5 rounded-full bg-warning-default transition-all duration-1000"
                      style={{ width: `${Math.min(100, (elapsedSeconds / timeRemainingInfo.timeRequired) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono tabular-nums text-warning-default font-medium whitespace-nowrap">
                    {formatElapsedTime(timeRemainingInfo.timeRemaining)}
                  </span>
                </div>
              </div>
            )}

            <div className="border-b border-background-dark mt-6">
              <nav className="flex gap-8" aria-label="Lesson tabs">
                {[
                  { id: 'description', label: 'Description' },
                  { id: 'notes', label: 'Notes' },
                  { id: 'resources', label: 'Resources' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-text-dark text-text-dark'
                        : 'border-transparent text-text-light hover:text-text-dark hover:border-background-dark'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="py-1">
              {activeTab === 'description' && (
                <div className="space-y-6">
                  <div className="prose max-w-none text-text-medium leading-relaxed">
                    {lessonDescriptionHtml}
                  </div>

                  {currentLesson.audio_attachment_url && (
                    <Card className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 text-lg">🎵</span>
                        </div>
                        <h3 className="text-sm font-semibold text-text-dark">Audio Narration</h3>
                      </div>
                      <AudioPlayer audioUrl={currentLesson.audio_attachment_url} />
                    </Card>
                  )}

                  <VideoErrorDisplay />

                  <div className="flex items-center gap-4 pt-4 border-t border-background-dark">
                    <span className="text-sm text-text-light">Was this helpful?</span>
                    <button
                      onClick={() => setLessonFeedback(lessonFeedback === 'up' ? null : 'up')}
                      className={`p-1.5 rounded-lg transition-colors ${
                        lessonFeedback === 'up'
                          ? 'bg-green-100 text-green-700'
                          : 'text-text-light hover:text-text-dark hover:bg-background-light'
                      }`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setLessonFeedback(lessonFeedback === 'down' ? null : 'down')}
                      className={`p-1.5 rounded-lg transition-colors ${
                        lessonFeedback === 'down'
                          ? 'bg-red-100 text-red-700'
                          : 'text-text-light hover:text-text-dark hover:bg-background-light'
                      }`}
                    >
                      <ThumbsDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="space-y-4">
                  <textarea
                    className="w-full h-64 p-4 border border-background-dark rounded-lg focus:ring-2 focus:ring-primary-default focus:border-primary-default outline-none text-sm resize-y"
                    placeholder="Take notes about this lesson..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <Button
                      variant="secondary"
                      onClick={saveNotes}
                      disabled={isSavingNotes}
                      size="sm"
                    >
                      {isSavingNotes ? 'Saving...' : 'Save Notes'}
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === 'resources' && (
                <div className="space-y-3">
                  {(currentLesson.resources && Array.isArray(currentLesson.resources) && currentLesson.resources.length > 0) || currentLesson.content_url ? (
                    <>
                      {currentLesson.resources && Array.isArray(currentLesson.resources) && currentLesson.resources.length > 0 ? (
                        currentLesson.resources.map((resource) =>
                          resource.type === 'link' ? (
                            <a
                              key={resource.id}
                              href={normalizeUrl(resource.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 p-3 border border-background-dark rounded-lg hover:bg-background-light no-underline"
                            >
                              <ExternalLink className="w-5 h-5 text-blue-600 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm text-text-dark truncate">{resource.title}</h4>
                                {resource.description && <p className="text-xs text-text-light truncate">{resource.description}</p>}
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
                                  <h4 className="font-medium text-sm text-text-dark truncate">{resource.title}</h4>
                                  {resource.description && <p className="text-xs text-text-light truncate">{resource.description}</p>}
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
                        )
                      ) : currentLesson.content_url ? (
                        <div
                          onClick={() => window.open(currentLesson.content_url, '_blank', 'noopener,noreferrer')}
                          className="flex items-center justify-between p-3 border border-background-dark rounded-lg hover:bg-background-light cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-text-muted" />
                            <div>
                              <h4 className="font-medium text-sm text-text-dark">Additional Content</h4>
                              <p className="text-xs text-text-light">External resource</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadFile(currentLesson.content_url, 'additional-content');
                            }}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-sm text-text-light py-4">No resources available for this lesson.</p>
                  )}
                </div>
              )}
            </div>

            {canManageCourse && (
              <div className="mb-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/app/courses/${courseId}/lesson/${currentLesson.id}/presentation`)}
                  className="text-primary-default hover:text-primary-dark"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Lesson Settings
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between pt-6 border-t border-background-dark">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPreviousLesson}
                disabled={lessons.findIndex(l => l.id === lessonId) === 0}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>

              {isLastLesson ? (
                <Button
                  onClick={async () => {
                    const allLessonsCompleted = lessons.every(lessonEntry => (
                      courseProgress[courseId]?.[lessonEntry.id]?.completed
                    ));
                    if (!allLessonsCompleted) {
                      showError('Keep going! Mark every lesson as completed to finish the course.');
                      return;
                    }
                    if (courseFinalAssessment && !finalAssessmentCompleted && canAccessAssessments(displayCourse)) {
                      navigate(`/app/courses/${courseId}/quiz/${courseFinalAssessment.id}`);
                    } else {
                      navigate(`/app/courses/${courseId}/completion`);
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  {courseFinalAssessment && !finalAssessmentCompleted && canAccessAssessments(displayCourse)
                    ? 'Take Final Assessment'
                    : 'Complete Course'}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => goToNextLesson(false)}
                  className="flex items-center gap-2"
                >
                  Go to next item
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </main>
      </div>

      <Modal
         isOpen={Boolean(activeKnowledgeCheck)}
         onClose={handleKnowledgeCheckModalClose}
         title={activeKnowledgeCheck ? activeKnowledgeCheck.title || 'Knowledge Check' : 'Knowledge Check'}
         size="default"
         showCloseButton
       >
        {activeKnowledgeCheck && (
          <KnowledgeCheckCard
            quiz={activeKnowledgeCheck}
            questions={quizQuestionsById[activeKnowledgeCheck.id] || []}
            initialResult={knowledgeCheckResults[activeKnowledgeCheck.id]}
            isCompleted={!!quizCompletionStatus[activeKnowledgeCheck.id]}
            onSubmit={handleKnowledgeCheckSubmit}
            onRetake={handleKnowledgeCheckReset}
            isActive
            variant="modal"
            onContinue={() => handleKnowledgeCheckContinue(activeKnowledgeCheck.id)}
          />
        )}
      </Modal>

      {/* Certificate Preview Modal */}
      {showCertificateModal && canAccessCertificates(displayCourse) && (
        <CertificatePreviewModal
          courseId={courseId}
          courseName={course?.title}
          userId={user?.id}
          isOpen={showCertificateModal}
          onClose={() => setShowCertificateModal(false)}
        />
      )}
    </div>
  )
}
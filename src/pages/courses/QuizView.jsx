import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuth';
import { useCourseStore } from '@/store/courseStore';
import { useToast } from '@/components/ui';
import { Button, Card } from '@/components/ui';
import BackButton from '@/components/ui/BackButton';
import { supabase, TABLES } from '@/lib/supabase';
import { 
  CheckCircle, 
  Clock, 
  RotateCcw, 
  AlertCircle, 
  Play,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Users,
  Calendar
} from 'lucide-react';
import QuizResult from '@/components/quiz/QuizResult';

function getNotesFromProgressMetadata(metadata) {
  if (metadata == null) return '';
  let parsed = metadata;
  if (typeof metadata === 'string') {
    try {
      parsed = JSON.parse(metadata);
    } catch {
      return '';
    }
  }
  if (typeof parsed === 'object' && parsed !== null && typeof parsed.notes === 'string') {
    return parsed.notes.trim();
  }
  return '';
}

const QuizView = () => {
  const { courseId, quizId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  
  // Store selectors
  const courses = useCourseStore(state => state.courses);
  const courseProgress = useCourseStore(state => state.courseProgress);
  const actions = useCourseStore(state => state.actions);
  
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Quiz state
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizTimeLeftSec, setQuizTimeLeftSec] = useState(null);
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [quizStartTime, setQuizStartTime] = useState(null);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizCompletionData, setQuizCompletionData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** Lesson notes aggregated for final-assessment review (before timer starts) */
  const [courseNotesForFinalReview, setCourseNotesForFinalReview] = useState([]);

  const quizTimerRef = useRef(null);
  const quizBlockRef = useRef(null);
  
  // Track if data has been loaded to prevent infinite loops
  const dataLoadedRef = useRef({ courseId: null, quizId: null });
  const isLoadingRef = useRef(false);

  const isCourseLevelGradedQuiz = useMemo(() => {
    return Boolean(quiz && !quiz.lesson_id && quiz.quiz_type === 'graded');
  }, [quiz]);

  // Load all saved lesson notes for this course (final assessment pre-start only)
  useEffect(() => {
    const loadCourseNotes = async () => {
      if (!user?.id || !courseId || !lessons.length || !isCourseLevelGradedQuiz) {
        setCourseNotesForFinalReview([]);
        return;
      }
      const { data, error } = await supabase
        .from(TABLES.LESSON_PROGRESS)
        .select('lesson_id, metadata')
        .eq('user_id', user.id)
        .eq('course_id', courseId);

      if (error) {
        setCourseNotesForFinalReview([]);
        return;
      }

      const titleById = new Map(lessons.map((l) => [l.id, l.title || 'Lesson']));
      const orderById = new Map(
        lessons.map((l, i) => [l.id, l.order_index != null ? l.order_index : i])
      );

      const rows = [];
      for (const row of data || []) {
        const text = getNotesFromProgressMetadata(row.metadata);
        if (!text) continue;
        rows.push({
          lessonId: row.lesson_id,
          lessonTitle: titleById.get(row.lesson_id) || 'Lesson',
          notes: text,
          order: orderById.get(row.lesson_id) ?? 9999,
        });
      }
      rows.sort((a, b) => a.order - b.order);
      setCourseNotesForFinalReview(rows);
    };

    loadCourseNotes();
  }, [user?.id, courseId, lessons, isCourseLevelGradedQuiz]);

  // Load course and quiz data
  useEffect(() => {
    // Early return if no courseId or quizId
    if (!courseId || !quizId) {
      return;
    }

    // Prevent re-fetching if we've already loaded data for this course/quiz
    if (dataLoadedRef.current.courseId === courseId && dataLoadedRef.current.quizId === quizId) {
      return;
    }

    // Prevent concurrent loads
    if (isLoadingRef.current) {
      return;
    }

    const loadQuizData = async () => {
      isLoadingRef.current = true;
      try {
        setLoading(true);
        
        // Get current courses from store directly to avoid dependency issues
        const { courses: coursesFromStore, actions: storeActions } = useCourseStore.getState();
        
        // Fetch courses if not already loaded
        let coursesToUse = coursesFromStore;
        if (coursesToUse.length === 0) {
          if (user?.id) {
            await storeActions.fetchCourses({}, user.id);
          } else {
            await storeActions.fetchCourses();
          }
          // Get fresh courses after fetch
          coursesToUse = useCourseStore.getState().courses;
        }
        
        // Find the current course
        const foundCourse = coursesToUse.find(c => c.id === courseId);
        if (foundCourse) {
          setCourse(foundCourse);
          storeActions.setCurrentCourse(foundCourse);
          
          // Fetch course lessons
          const { data: fetchedLessons } = await storeActions.fetchCourseLessons(courseId);
          if (fetchedLessons && Object.keys(fetchedLessons).length > 0) {
            const flatLessons = [];
            Object.values(fetchedLessons).forEach(moduleData => {
              if (moduleData.lessons && Array.isArray(moduleData.lessons)) {
                flatLessons.push(...moduleData.lessons);
              }
            });
            flatLessons.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
            setLessons(flatLessons);
          }
          
          // Fetch all quizzes for the course
          const { data: courseQuizzes } = await storeActions.fetchQuizzes(courseId);
          if (courseQuizzes && Array.isArray(courseQuizzes)) {
            setQuizzes(courseQuizzes);
            
            // Find the current quiz
            const foundQuiz = courseQuizzes.find(q => q.id === quizId);
            if (foundQuiz) {
              setQuiz(foundQuiz);
              
              // Fetch quiz questions
              const { data: questions } = await storeActions.fetchQuizQuestions(quizId);
              setQuizQuestions(questions || []);
              
              // Check if quiz is completed
              if (user?.id) {
                try {
                  const { data: progress } = await storeActions.fetchCourseProgress(user.id, courseId);
                  const quizProgress = progress?.quiz_completions?.[quizId];
                  if (quizProgress?.completed) {
                    setQuizCompleted(true);
                    setQuizCompletionData(quizProgress);
                  }
                } catch (err) {
                  // No quiz progress found - this is normal
                }
              }
            }
          }
        }
        
        // Mark data as loaded for this course/quiz combination
        dataLoadedRef.current = { courseId, quizId };
        setLoading(false);
      } catch (error) {
        // Handle error silently or set error state if needed
        setLoading(false);
        // Don't mark as loaded on error - allow retry on next render
      } finally {
        isLoadingRef.current = false;
      }
    };

    loadQuizData();
  }, [courseId, quizId, user?.id]);

  useEffect(() => {
    if (quiz && quiz.quiz_type === 'non_graded' && !quizStarted && !quizCompleted) {
      setQuizStarted(true);
      setQuizStartTime(Date.now());
      if (quiz?.time_limit_minutes) {
        setQuizTimeLeftSec(quiz.time_limit_minutes * 60);
      }
    }
  }, [quiz, quizStarted, quizCompleted]);

  // Timer effect
  useEffect(() => {
    if (quizTimeLeftSec === null || !quizStarted) return;

    quizTimerRef.current = setInterval(() => {
      setQuizTimeLeftSec(prev => {
        if (prev <= 1) {
          // Time's up - auto submit
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (quizTimerRef.current) {
        clearInterval(quizTimerRef.current);
      }
    };
  }, [quizTimeLeftSec, quizStarted]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const setAnswer = (questionIndex, answer) => {
    setQuizAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const startQuiz = () => {
    setQuizStarted(true);
    setQuizStartTime(Date.now());
    if (quiz?.time_limit_minutes) {
      setQuizTimeLeftSec(quiz.time_limit_minutes * 60);
    }
  };

  const handleSubmitQuiz = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      // Calculate score
      let score = 0;
      const max = quizQuestions.length;
      const questionResults = [];
      
      quizQuestions.forEach((question, idx) => {
        const userAnswer = quizAnswers[idx];
        let isCorrect = false;
        
        switch (question.question_type) {
          case 'multiple_choice':
            isCorrect = userAnswer === question.correct_answer;
            break;
          case 'multiple_select':
            isCorrect = JSON.stringify(userAnswer?.sort()) === JSON.stringify(question.correct_answer?.sort());
            break;
          case 'true_false':
            isCorrect = userAnswer === question.correct_answer;
            break;
          case 'short_answer':
            isCorrect = userAnswer?.toLowerCase().trim() === question.correct_answer?.toLowerCase().trim();
            break;
          default:
            isCorrect = false;
        }
        
        if (isCorrect) score++;
        
        questionResults.push({
          questionIndex: idx,
          isCorrect,
          userAnswer,
          correctAnswer: question.correct_answer
        });
      });
      
      const timeSpent = Math.floor((Date.now() - quizStartTime) / 1000);
      const percentage = Math.round((score / max) * 100);
      const passed = percentage >= (quiz.pass_threshold || 70);
      
      // Submit quiz attempt
      if (user?.id && quiz?.id) {
        try {
          const result = await actions.submitQuizAttempt(user.id, quiz.id, quizAnswers, score, max);
          
          if (result.data?.passed) {
            setQuizCompleted(true);
            setQuizCompletionData({
              score: result.data.score,
              maxScore: result.data.max_score,
              percentage: result.data.percentage,
              completedAt: new Date().toISOString()
            });
          }
        } catch {
          showError('Could not save quiz results. Please try again.');
        }
      }
      
      // Set quiz result
      setQuizResult({
        score,
        maxScore: max,
        timeSpent,
        userAnswers: { ...quizAnswers },
        passed,
        percentage,
        questionResults
      });
      
      setShowQuizResult(true);
      
    } catch {
      showError('Failed to submit quiz');
    } finally {
      setIsSubmitting(false);
      setQuizStarted(false);
      setQuizTimeLeftSec(null);
    }
  };

  const handleRetakeQuiz = () => {
    setShowQuizResult(false);
    setQuizResult(null);
    setQuizCompleted(false);
    setQuizCompletionData(null);
    startQuiz();
  };

  const handleCloseQuizResult = () => {
    setShowQuizResult(false);
    setQuizResult(null);
  };

  const getCurrentQuizIndex = () => {
    return quizzes.findIndex(q => q.id === quizId);
  };

  const getNextQuiz = () => {
    const currentIndex = getCurrentQuizIndex();
    return currentIndex < quizzes.length - 1 ? quizzes[currentIndex + 1] : null;
  };

  const getPrevQuiz = () => {
    const currentIndex = getCurrentQuizIndex();
    return currentIndex > 0 ? quizzes[currentIndex - 1] : null;
  };

  const navigateToQuiz = (targetQuiz) => {
    if (targetQuiz) {
      navigate(`/app/courses/${courseId}/quiz/${targetQuiz.id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-default flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-default mx-auto mb-4"></div>
          <p className="text-text-light">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-background-default flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-error-default mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-text-dark mb-2">Quiz Not Found</h2>
          <p className="text-text-light mb-4">The quiz you're looking for doesn't exist.</p>
          <BackButton 
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            text="Back to Course"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-default">
      {/* Header */}
      <div className="bg-white border-b border-border-default">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 ">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <BackButton 
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-medium hover:text-text-dark transition-colors"
                text="Back to Course"
              />
              <div className="h-6 w-px bg-border-default" />
              <div>
                <h1 className="text-lg font-semibold text-text-dark">{quiz.title}</h1>
                <p className="text-sm text-text-light">{course?.title}</p>
              </div>
            </div>
            
            {/* Quiz Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateToQuiz(getPrevQuiz())}
                disabled={!getPrevQuiz()}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-text-light px-3">
                {getCurrentQuizIndex() + 1} of {quizzes.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateToQuiz(getNextQuiz())}
                disabled={!getNextQuiz()}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card className="p-6" ref={quizBlockRef}>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-text-dark mb-2">{quiz.title}</h2>
                {quiz.description && (
                  <p className="text-text-light mb-4">{quiz.description}</p>
                )}
                
                {/* Quiz Info */}
                <div className="flex items-center gap-6 text-sm text-text-light mb-6">
                  {quiz.time_limit_minutes && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{quiz.time_limit_minutes} minutes</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    <span>{quizQuestions.length} questions</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    <span>{quiz.pass_threshold || 70}% to pass</span>
                  </div>
                </div>
              </div>

              {!quizStarted && !quizCompleted && (
                <div className="py-8">
                  {isCourseLevelGradedQuiz && (
                    <div className="mb-8 text-left rounded-lg border border-border-default bg-background-light/60 overflow-hidden">
                      <div className="px-4 py-3 border-b border-border-default bg-background-light">
                        <h3 className="font-semibold text-text-dark flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-primary-default flex-shrink-0" />
                          Your notes from this course
                        </h3>
                        <p className="text-sm text-text-light mt-1">
                          All notes you saved on lesson pages appear here so you can review before the timer starts.
                        </p>
                      </div>
                      <div className="max-h-96 overflow-y-auto p-4 space-y-4">
                        {courseNotesForFinalReview.length === 0 ? (
                          <p className="text-sm text-text-light text-center py-6">
                            No saved lesson notes yet. Use the Notes tab on each lesson while you study.
                          </p>
                        ) : (
                          courseNotesForFinalReview.map((item) => (
                            <div
                              key={item.lessonId}
                              className="rounded-md border border-border-default bg-white p-4 shadow-sm"
                            >
                              <h4 className="text-sm font-medium text-primary-default mb-2">{item.lessonTitle}</h4>
                              <div className="text-sm text-text-dark whitespace-pre-wrap font-sans">{item.notes}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  <div className="text-center">
                    <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="w-8 h-8 text-primary-default" />
                    </div>
                    <h3 className="text-xl font-semibold text-text-dark mb-2">Ready to Start?</h3>
                    <p className="text-text-light mb-6">
                      This quiz contains {quizQuestions.length} questions and
                      {quiz.time_limit_minutes ? ` has a ${quiz.time_limit_minutes} minute time limit.` : ' has no time limit.'}
                    </p>
                    <Button onClick={startQuiz} size="lg">
                      <Play className="w-4 h-4 mr-2" />
                      Start Quiz
                    </Button>
                  </div>
                </div>
              )}

              {quizCompleted && !quizStarted && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-success-light rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-success-default" />
                  </div>
                  <h3 className="text-xl font-semibold text-text-dark mb-2">Quiz Completed!</h3>
                  <div className="text-text-light mb-6">
                    <p>Score: {quizCompletionData?.score}/{quizCompletionData?.maxScore} ({quizCompletionData?.percentage}%)</p>
                    <p>Completed: {quizCompletionData?.completedAt ? new Date(quizCompletionData.completedAt).toLocaleDateString() : 'Recently'}</p>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <Button onClick={startQuiz} variant="secondary">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Retake Quiz
                    </Button>
                    <Button 
                      onClick={() => {
                        if (quizResult) {
                          setShowQuizResult(true);
                        } else if (quizCompletionData) {
                          // Reconstruct quiz result from completion data
                          setQuizResult({
                            score: quizCompletionData.score,
                            maxScore: quizCompletionData.maxScore,
                            percentage: quizCompletionData.percentage,
                            passed: quizCompletionData.passed,
                            userAnswers: quizCompletionData.answers || {},
                            timeSpent: quizCompletionData.timeSpent || 0
                          });
                          setShowQuizResult(true);
                        }
                      }}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      View Results
                    </Button>
                  </div>
                </div>
              )}

              {quizStarted && !showQuizResult && (
                <div className="space-y-6">
                  {/* Quiz Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-text-dark">
                      Question {Object.keys(quizAnswers).length + 1} of {quizQuestions.length}
                    </h3>
                    {quizTimeLeftSec !== null && (
                      <div className={`text-lg font-bold ${quizTimeLeftSec <= 60 ? 'text-error-default' : 'text-text-dark'}`}>
                        {formatTime(quizTimeLeftSec)}
                      </div>
                    )}
                  </div>

                  {/* Questions */}
                  {quizQuestions.map((question, idx) => (
                    <div key={idx} className="border rounded-lg p-6">
                      <div className="font-medium text-text-dark mb-4">
                        {idx + 1}. {question.question_text}
                      </div>
                      
                      {question.question_type === 'multiple_choice' && (
                        <div className="space-y-3">
                          {(question.options || []).map((option, optIdx) => (
                            <label key={optIdx} className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="radio"
                                name={`question-${idx}`}
                                checked={quizAnswers[idx] === optIdx}
                                onChange={() => setAnswer(idx, optIdx)}
                                className="w-4 h-4 text-primary-default"
                              />
                              <span className="text-text-dark">{option}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {question.question_type === 'multiple_select' && (
                        <div className="space-y-3">
                          {(question.options || []).map((option, optIdx) => (
                            <label key={optIdx} className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Array.isArray(quizAnswers[idx]) ? quizAnswers[idx].includes(optIdx) : false}
                                onChange={(e) => {
                                  const prev = new Set(Array.isArray(quizAnswers[idx]) ? quizAnswers[idx] : []);
                                  if (e.target.checked) {
                                    prev.add(optIdx);
                                  } else {
                                    prev.delete(optIdx);
                                  }
                                  setAnswer(idx, Array.from(prev));
                                }}
                                className="w-4 h-4 text-primary-default"
                              />
                              <span className="text-text-dark">{option}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {question.question_type === 'true_false' && (
                        <div className="space-y-3">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="radio"
                              name={`question-${idx}`}
                              checked={quizAnswers[idx] === true}
                              onChange={() => setAnswer(idx, true)}
                              className="w-4 h-4 text-primary-default"
                            />
                            <span className="text-text-dark">True</span>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="radio"
                              name={`question-${idx}`}
                              checked={quizAnswers[idx] === false}
                              onChange={() => setAnswer(idx, false)}
                              className="w-4 h-4 text-primary-default"
                            />
                            <span className="text-text-dark">False</span>
                          </label>
                        </div>
                      )}

                      {question.question_type === 'short_answer' && (
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-primary-default focus:border-transparent"
                          value={quizAnswers[idx] || ''}
                          onChange={(e) => setAnswer(idx, e.target.value)}
                          placeholder="Your answer"
                        />
                      )}
                    </div>
                  ))}

                  {/* Submit Button */}
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSubmitQuiz}
                      disabled={isSubmitting || Object.keys(quizAnswers).length === 0}
                      size="lg"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            {/* Quiz Results */}
            {showQuizResult && quizResult && (
              <div className="mt-6">
                <QuizResult
                  quiz={quiz}
                  questions={quizQuestions}
                  userAnswers={quizResult.userAnswers}
                  score={quizResult.score}
                  maxScore={quizResult.maxScore}
                  timeSpent={quizResult.timeSpent}
                  passed={quizResult.passed}
                  percentage={quizResult.percentage}
                  onRetake={handleRetakeQuiz}
                  onClose={handleCloseQuizResult}
                />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-6">
              <h3 className="font-semibold text-text-dark mb-4">Course Content</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {lessons.map((lesson, index) => (
                  <button
                    key={lesson.id}
                    onClick={() => navigate(`/app/courses/${courseId}/lesson/${lesson.id}`)}
                    className="w-full text-left p-3 rounded-lg transition-colors hover:bg-background-light"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {courseProgress[courseId]?.[lesson.id]?.completed ? (
                          <CheckCircle className="w-5 h-5 text-success-default" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-background-dark flex items-center justify-center">
                            <span className="text-xs">{index + 1}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{lesson.title}</h4>
                        <p className="text-xs text-text-light">{formatTime(lesson.duration_minutes * 60 || 0)}</p>
                      </div>
                    </div>
                  </button>
                ))}
                
                {/* Quiz Items */}
                {quizzes.map((qz, index) => {
                  const isCompleted = quizCompletionData && qz.id === quiz.id ? true : false;
                  const isCurrent = qz.id === quiz.id;
                  
                  return (
                    <button
                      key={qz.id}
                      onClick={() => navigate(`/app/courses/${courseId}/quiz/${qz.id}`)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        isCurrent
                          ? 'bg-primary-light text-primary-default'
                          : 'hover:bg-background-light'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          {isCompleted ? (
                            <CheckCircle className="w-5 h-5 text-success-default" />
                          ) : isCurrent ? (
                            <Play className="w-5 h-5 text-primary-default" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border border-background-dark flex items-center justify-center">
                              <span className="text-xs">{lessons.length + index + 1}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">
                            <span className="text-primary-default">Quiz:</span> {qz.title}
                          </h4>
                          <p className="text-xs text-text-light">
                            {qz.time_limit_minutes ? `${qz.time_limit_minutes} min` : 'No time limit'} • {qz.question_count || 0} questions
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizView;

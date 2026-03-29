// src/pages/dashboard/Progress.jsx - Fixed loading states
import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import PageTitle from '@/components/layout/PageTitle';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ProgressChart from '@/components/dashboard/ProgressChart';
import EnrolledCourses from '@/components/dashboard/EnrolledCourses';
import Recommendations from '@/components/dashboard/Recommendations';
import { useCourseStore } from '@/store/courseStore';
import { useAuth } from '@/hooks/auth/useAuth';
import { 
  TrendingUp, 
  BookOpen, 
  Award, 
  Clock, 
  Target,
  Calendar,
  BarChart3,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

export default function Progress() {
  const { user } = useAuth();
  
  // Get store data with individual selectors
  const enrolledCourses = useCourseStore(state => state.enrolledCourses);
  const certificates = useCourseStore(state => state.certificates);
  const loading = useCourseStore(state => state.loading);
  const error = useCourseStore(state => state.error);
  const fetchEnrolledCourses = useCourseStore(state => state.actions.fetchEnrolledCourses);
  const fetchCertificates = useCourseStore(state => state.actions.fetchCertificates);
  
  // Local state for component-level loading
  const [isInitializing, setIsInitializing] = useState(true);
  const [lastAttempt, setLastAttempt] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [stats, setStats] = useState({
    totalCourses: 0,
    completedCourses: 0,
    inProgressCourses: 0,
    totalHours: 0,
    certificates: 0,
    streak: 0
  });



  // Calculate stats whenever data changes
  useEffect(() => {
    if (enrolledCourses && Array.isArray(enrolledCourses)) {
      const completed = enrolledCourses.filter(course => course.progress_percentage === 100).length;
      const inProgress = enrolledCourses.filter(course => 
        course.progress_percentage > 0 && course.progress_percentage < 100
      ).length;
      
      const totalHours = enrolledCourses.reduce((sum, course) => {
        const duration = course.duration || 0;
        return sum + duration;
      }, 0) / 60;

      setStats({
        totalCourses: enrolledCourses.length,
        completedCourses: completed,
        inProgressCourses: inProgress,
        totalHours: Math.round(totalHours),
        certificates: certificates?.length || 0,
        streak: 7 // Mock data
      });
    } else {
      setStats({
        totalCourses: 0,
        completedCourses: 0,
        inProgressCourses: 0,
        totalHours: 0,
        certificates: certificates?.length || 0,
        streak: 0
      });
    }
  }, [enrolledCourses, certificates]);

  // Initial data load with timeout and retry logic
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) {
        setIsInitializing(false);
        return;
      }

      if (!fetchEnrolledCourses || typeof fetchEnrolledCourses !== 'function') {
        setIsInitializing(false);
        return;
      }

      setLastAttempt(Date.now());

      try {
        // Set a timeout for the fetch operation
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 15000); // 15 second timeout
        });

        const fetchPromise = Promise.all([
          fetchEnrolledCourses(user.id),
          fetchCertificates(user.id)
        ]);

        const [enrollmentsResult, certificatesResult] = await Promise.race([
          fetchPromise,
          timeoutPromise
        ]);
        
        setRetryCount(0); // Reset retry count on success
      } catch (error) {
        setRetryCount(prev => prev + 1);
      } finally {
        setIsInitializing(false);
      }
    };

    // Only load if we haven't initialized yet
    if (isInitializing && user?.id) {
      loadData();
    }
  }, [user?.id, fetchEnrolledCourses, fetchCertificates, isInitializing]);

  // Manual refresh function
  const handleRefresh = async () => {
    if (!user?.id) return;
    
    
    setIsInitializing(true);
    setLastAttempt(Date.now());
    
    try {
      await Promise.all([
        fetchEnrolledCourses(user.id),
        fetchCertificates(user.id)
      ]);
      setRetryCount(0);
    } catch (error) {
      setRetryCount(prev => prev + 1);
    } finally {
      setIsInitializing(false);
    }
  };

  // Determine actual loading state
  const isActuallyLoading = isInitializing || loading?.enrollments || loading?.courses;
  
  // Show loading state
  if (isActuallyLoading && retryCount < 3) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center min-h-96">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-text-light">Loading your learning progress...</p>
          {lastAttempt && (
            <p className="text-xs text-text-muted mt-2">
              Started {Math.round((Date.now() - lastAttempt) / 1000)}s ago
            </p>
          )}
          {retryCount > 0 && (
            <p className="text-xs text-warning-default mt-1">
              Retry attempt {retryCount}/3
            </p>
          )}
        </div>
      </div>
    );
  }

  // Show error state with retry option
  if (error || retryCount >= 3) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-medium text-red-800">Unable to Load Progress</h3>
          </div>
          <p className="text-red-600 mb-4">
            {error || `Failed to load data after ${retryCount} attempts`}
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <button
              onClick={() => {
                setRetryCount(0);
                setIsInitializing(false);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Skip Loading
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main content
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageTitle
          title="Learning Progress"
          subtitle="Track your learning journey and celebrate your achievements"
        />
        <button
          onClick={handleRefresh}
          disabled={isActuallyLoading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-default text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isActuallyLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-light rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary-default" />
            </div>
            <div>
              <p className="text-sm text-text-light">Total Courses</p>
              <p className="text-2xl font-bold text-text-dark">{stats.totalCourses}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Award className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-text-light">Completed</p>
              <p className="text-2xl font-bold text-text-dark">{stats.completedCourses}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-text-light">In Progress</p>
              <p className="text-2xl font-bold text-text-dark">{stats.inProgressCourses}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-text-light">Total Hours</p>
              <p className="text-2xl font-bold text-text-dark">{stats.totalHours}h</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Content based on data availability */}
      {enrolledCourses && enrolledCourses.length > 0 ? (
        <>
          {/* In-Progress Snapshot */}
          {enrolledCourses.some(c => (c.progress_percentage || 0) > 0 && (c.progress_percentage || 0) < 100) && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-text-dark">In Progress</h2>
                <span className="text-sm text-text-light">
                  {enrolledCourses.filter(c => (c.progress_percentage || 0) > 0 && (c.progress_percentage || 0) < 100).length} courses
                </span>
              </div>
              <div className="space-y-3">
                {enrolledCourses
                  .filter(c => (c.progress_percentage || 0) > 0 && (c.progress_percentage || 0) < 100)
                  .slice(0, 6)
                  .map(course => (
                    <div key={course.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-8 rounded overflow-hidden bg-background-medium flex items-center justify-center flex-shrink-0">
                          {course.thumbnail_url ? (
                            <img src={course.thumbnail_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <BookOpen className="w-4 h-4 text-text-muted" />
                          )}
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-medium text-text-dark truncate">{course.title}</p>
                          <p className="text-xs text-text-muted">{course.progress_percentage || 0}% complete</p>
                        </div>
                      </div>
                      <div className="w-40 flex items-center gap-2">
                        <div className="flex-1 bg-background-medium h-2 rounded-full">
                          <div
                            className="h-2 rounded-full bg-primary-default"
                            style={{ width: `${course.progress_percentage || 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-text-muted whitespace-nowrap">{course.progress_percentage || 0}%</span>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          )}

          {/* Progress Chart */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-text-dark">Learning Trends</h2>
              <div className="flex items-center gap-2 text-sm text-text-light">
                <Calendar className="w-4 h-4" />
                <span>Last 30 days</span>
              </div>
            </div>
            <ProgressChart />
          </Card>

          {/* Course Progress */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-text-dark">Course Progress</h2>
              <div className="flex items-center gap-2 text-sm text-text-light">
                <BarChart3 className="w-4 h-4" />
                <span>{enrolledCourses.length} courses</span>
              </div>
            </div>
            <EnrolledCourses />
          </Card>
        </>
      ) : (
        /* Empty State */
        <Card className="p-12 text-center">
          <BookOpen className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-text-dark mb-2">No Courses Yet</h3>
          <p className="text-text-light mb-6">
            Start your learning journey by enrolling in your first course
          </p>
          <button className="inline-flex items-center gap-2 px-6 py-3 bg-primary-default text-white rounded-lg hover:bg-primary-dark transition-colors">
            Browse Courses
          </button>
        </Card>
      )}

      {/* Recommendations */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-text-dark">Recommended Next Steps</h2>
          <Target className="w-5 h-5 text-text-muted" />
        </div>
        <Recommendations />
      </Card>
    </div>
  );
}
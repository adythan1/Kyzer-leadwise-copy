// src/pages/dashboard/Dashboard.jsx
import { useAuth } from "@/hooks/auth/useAuth";
import PageTitle from "@/components/layout/PageTitle";
import { useEnrollment } from "@/hooks/courses/useEnrollment";
import { useRecentActivity } from "@/hooks/courses/useRecentActivity";
import DashboardStatsGrid from "@/components/dashboard/DashboardStatsGrid";
import MetricTile from "@/components/ui/MetricTile";
import RecentActivity from "@/components/dashboard/RecentActivity";
import EnrolledCourses from "@/components/dashboard/EnrolledCourses";
import Recommendations from "@/components/dashboard/Recommendations";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Link } from "react-router-dom";
import { Building2, TrendingUp, Trophy } from "lucide-react";

export const Dashboard = () => {
  const { user, profile } = useAuth();
  const {
    enrollments,
    stats,
    loading: enrollmentLoading,
    error: enrollmentError,
  } = useEnrollment();
  const { activities, loading: activityLoading } = useRecentActivity();

  if (enrollmentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (enrollmentError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-text-dark mb-2">
            Something went wrong
          </h2>
          <p className="text-text-light mb-4">{enrollmentError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const isCompanyAccount = profile?.account_type === "corporate";

  return (
    <div className="min-h-screen bg-background-light">
      <div className="max-w-8xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <PageTitle
            title={`${getGreeting()}, ${profile?.first_name || user?.email}!`}
          />
          <div className="flex gap-3">
            <Link to="/app/courses">
              <button
                type="button"
                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
              >
                Browse Courses
              </button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-8xl mx-auto px-4 py-8">
        <DashboardStatsGrid stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <EnrolledCourses
              courses={enrollments
                .filter((enrollment) => enrollment.courses)
                .map((enrollment) => ({
                  id: enrollment.courses.id,
                  title: enrollment.courses.title,
                  description: enrollment.courses.description,
                  thumbnail_url: enrollment.courses.thumbnail_url,
                  difficulty_level: enrollment.courses.difficulty_level,
                  progress: enrollment.progress_percentage || 0,
                  status:
                    enrollment.progress_percentage >= 100
                      ? "completed"
                      : enrollment.progress_percentage > 0
                        ? "in-progress"
                        : "not-started",
                  enrollment_id: enrollment.id,
                  enrolled_at: enrollment.enrolled_at,
                  completed_at: enrollment.completed_at,
                  last_accessed: enrollment.last_accessed,
                }))}
              loading={enrollmentLoading}
            />
          </div>

          <div className="space-y-8">
            <RecentActivity activities={activities} loading={activityLoading} />
            <Recommendations
              enrollments={enrollments}
              isCompanyAccount={isCompanyAccount}
            />
          </div>
        </div>

        {isCompanyAccount && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-text-dark mb-4">
              Company Overview
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <MetricTile
                layout="stack"
                variant="blue"
                icon={Building2}
                title="Employees"
                value={profile?.employee_count || 0}
                paddingClassName="p-4"
              />
              <MetricTile
                layout="stack"
                variant="purple"
                icon={TrendingUp}
                title="Company Average"
                value={`${Math.round(stats.averageProgress)}%`}
                paddingClassName="p-4"
              />
              <MetricTile
                layout="stack"
                variant="green"
                icon={Trophy}
                title="Certificates Earned"
                value={stats.completed}
                paddingClassName="p-4"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

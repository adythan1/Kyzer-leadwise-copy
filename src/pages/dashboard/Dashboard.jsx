// src/pages/dashboard/Dashboard.jsx
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/auth/useAuth";
import PageTitle from "@/components/layout/PageTitle";
import { useEnrollment } from "@/hooks/courses/useEnrollment";
import { useRecentActivity } from "@/hooks/courses/useRecentActivity";
import StatsCard from "@/components/dashboard/StatsCard";
import RecentActivity from "@/components/dashboard/RecentActivity";
import EnrolledCourses from "@/components/dashboard/EnrolledCourses";
import Recommendations from "@/components/dashboard/Recommendations";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

import {
  BookOpen,
  Trophy,
  Clock,
  TrendingUp,
  User,
  Building,
} from "lucide-react";
import { Link } from "react-router-dom";

export const Dashboard = () => {
  const { user, profile } = useAuth();
  const {
    enrollments,
    stats,
    loading: enrollmentLoading,
    error: enrollmentError,
  } = useEnrollment();
  const { activities, loading: activityLoading } = useRecentActivity();

  // Show loading state
  if (enrollmentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // Show error state
  if (enrollmentError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-text-dark mb-2">
            Something went wrong
          </h2>
          <p className="text-text-light mb-4">{enrollmentError}</p>
          <button
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
      {/* Header Section */}
      {/* <div className="bg-white border-b border-background-dark"> */}
        <div className="max-w-8xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <PageTitle
              title={`${getGreeting()}, ${profile?.first_name || user?.email}!`}
            />
            {/* Quick Action Button */}
            <div className="flex gap-3">
              <Link to="/app/courses">
                <button className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors">
                  Browse Courses
                </button>
              </Link>
            </div>
          </div>
        {/* </div> */}
      </div>

      {/* Main Dashboard Content */}
      <div className="max-w-8xl mx-auto px-4 py-8">
        {/* Stats Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Enrolled Courses"
            value={stats.totalEnrolled}
            icon={BookOpen}
            color="blue"
          />
          <StatsCard
            title="Completed"
            value={stats.completed}
            icon={Trophy}
            color="green"
          />
          <StatsCard
            title="In Progress"
            value={stats.inProgress}
            icon={Clock}
            color="orange"
          />
          <StatsCard
            title="Average Progress"
            value={`${stats.averageProgress}%`}
            icon={TrendingUp}
            color="purple"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Enrolled Courses */}
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

          {/* Right Column - Activity & Recommendations */}
          <div className="space-y-8">
            <RecentActivity activities={activities} loading={activityLoading} />
            <Recommendations
              enrollments={enrollments}
              isCompanyAccount={isCompanyAccount}
            />
          </div>
        </div>

        {/* Company-specific section */}
        {isCompanyAccount && (
          <div className="mt-8">
            <div className="bg-white rounded-lg border border-background-dark p-6">
              <h3 className="text-lg font-semibold text-text-dark mb-4">
                Company Overview
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-background-light rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {profile?.employee_count || 0}
                  </div>
                  <div className="text-sm text-text-light">Employees</div>
                </div>
                <div className="text-center p-4 bg-background-light rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {Math.round(stats.averageProgress)}%
                  </div>
                  <div className="text-sm text-text-light">Company Average</div>
                </div>
                <div className="text-center p-4 bg-background-light rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {stats.completed}
                  </div>
                  <div className="text-sm text-text-light">
                    Certificates Earned
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

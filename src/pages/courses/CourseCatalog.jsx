// src/pages/courses/CourseCatalog.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCourseStore } from "@/store/courseStore";
import { useAuth } from "@/hooks/auth/useAuth";
import { useSubscription } from "@/hooks/courses/useSubscription";
import { 
  Search, 
  Filter, 
  Grid, 
  List, 
  Star, 
  Clock, 
  Users, 
  BookOpen, 
  Play, 
  Settings,
  TrendingUp,
  Award,
  Lock,
  ArrowRight
} from "lucide-react";
import { 
  Button, 
  Card, 
  LoadingSpinner,
  ActionButton,
  StatusBadge,
  EmptyState
} from "@/components/ui";
import Tooltip from "@/components/ui/Tooltip";
import PageTitle from "@/components/layout/PageTitle";
import { LockedCourseOverlay, LockedCourseBadge, FreeTrialBadge } from "@/components/course/UpgradePrompt";

const CourseCatalog = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFreeTrial, canAccessCourse } = useSubscription();
  
    // Store selectors - memoized to prevent infinite loops
  const courses = useCourseStore(state => state.courses);
  const enrolledCourses = useCourseStore(state => state.enrolledCourses);
  const loading = useCourseStore(state => state.loading);
  const error = useCourseStore(state => state.error);
  
  const fetchCourses = useCourseStore(state => state.actions.fetchCourses);
  const getCourseCounts = useCourseStore(state => state.actions.getCourseCounts);
  const enrollInCourse = useCourseStore(state => state.actions.enrollInCourse);

  // Local state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState("grid");
  const [courseCounts, setCourseCounts] = useState({}); // { [courseId]: { modules, lessons } }

  // Categories and levels
  // Store selectors - individual to prevent infinite loops
  const storeCategories = useCourseStore(state => state.categories);
  const loadingCategories = useCourseStore(state => state.loading.categories);
  const fetchCategories = useCourseStore(state => state.actions.fetchCategories);
  
  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);
  
  // Build categories array with "All Categories" option
  const categories = [
    { id: "all", name: "All Categories", color: "bg-gray-100 text-gray-700" },
    ...(storeCategories?.map(cat => ({
      id: cat.id,
      name: cat.name,
      color: `bg-[${cat.color}]20 text-[${cat.color}]`
    })) || [])
  ];

  const levels = [
    { id: "all", name: "All Levels", color: "bg-gray-100 text-gray-700" },
    { id: "beginner", name: "Beginner", color: "bg-green-100 text-green-700" },
    { id: "intermediate", name: "Intermediate", color: "bg-yellow-100 text-yellow-700" },
    { id: "advanced", name: "Advanced", color: "bg-red-100 text-red-700" },
  ];

  const sortOptions = [
    { id: "newest", name: "Newest First", icon: TrendingUp },
    { id: "popular", name: "Most Popular", icon: Users },
    { id: "rating", name: "Highest Rated", icon: Star },
    { id: "duration", name: "Shortest First", icon: Clock },
  ];

  // Fetch courses on mount (catalog rules: published, catalog-visible, org restriction)
  useEffect(() => {
    if (user?.id) {
      fetchCourses({ learnerCatalog: true }, user.id);
    } else {
      fetchCourses({ learnerCatalog: true });
    }
  }, [fetchCourses, user?.id]);

  // Load counts (modules, lessons) for visible courses
  useEffect(() => {
    const loadCounts = async (coursesToFetch) => {
      const missing = coursesToFetch.filter(c => !courseCounts[c.id]);
      if (missing.length === 0) return;
      try {
        const results = await Promise.all(missing.map(async (c) => {
          const { data } = await getCourseCounts(c.id);
          return { id: c.id, counts: data };
        }));
        setCourseCounts(prev => {
          const next = { ...prev };
          results.forEach(r => {
            next[r.id] = r.counts || { modules: 0, lessons: 0 };
          });
          return next;
        });
      } catch (_) {
        // ignore
      }
    };
    if (courses && courses.length > 0) {
      loadCounts(courses);
    }
  }, [courses, getCourseCounts]);

  // Check if user is enrolled in a course
  const isEnrolled = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    return course?.isEnrolled || false;
  };

  // Check if user can continue learning (has progress less than 100%)
  const canContinueLearning = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    return course?.canContinue || false;
  };

  // Handle course enrollment
  const handleEnroll = async (courseId) => {
    if (!courseId || typeof courseId !== "string") {
      return;
    }
    if (!user) {
      navigate('/login');
      return;
    }

    const course = courses.find(c => c.id === courseId);
    if (course && !canAccessCourse(course)) {
      navigate('/pricing');
      return;
    }

    // If already enrolled and can continue learning, navigate to course
    if (isEnrolled(courseId) && canContinueLearning(courseId)) {
      navigate(`/app/courses/${courseId}`);
      return;
    }

    // If already enrolled but completed, navigate to course for review
    if (isEnrolled(courseId) && !canContinueLearning(courseId)) {
      navigate(`/app/courses/${courseId}`);
      return;
    }

    try {
      await enrollInCourse(user.id, courseId);
      navigate(`/app/courses/${courseId}`);
    } catch (error) {
      // Handle error silently or set error state if needed
    }
  };

  // Filter and sort courses
  const filteredCourses = courses?.filter((course) => {
    const matchesSearch = course.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Category filtering with real categories
    const matchesCategory = selectedCategory === "all" || 
                           course.category?.id === selectedCategory;
    
    const matchesLevel = selectedLevel === "all" || 
                        course.difficulty_level?.toLowerCase() === selectedLevel.toLowerCase();
    
    return matchesSearch && matchesCategory && matchesLevel;
  }) || [];

  const sortedCourses = [...filteredCourses].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.created_at) - new Date(a.created_at);
      case "popular":
        return (b.students || 0) - (a.students || 0);
      case "rating":
        return (b.rating || 0) - (a.rating || 0);
      case "duration":
        return (a.duration_minutes || 0) - (b.duration_minutes || 0);
      default:
        return 0;
    }
  });

  const formatDuration = (totalMinutes) => {
    const minutes = Math.max(0, Math.floor(totalMinutes || 0));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  };

  // Course card component
  const CourseCard = ({ course }) => {
    const isLocked = isFreeTrial && !canAccessCourse(course);

    return (
    <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col h-full">
      {/* Course Image */}
      <div className="relative h-48 overflow-hidden flex-shrink-0">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={`${course.title} thumbnail`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
            <BookOpen className="w-16 h-16 text-indigo-400" />
          </div>
        )}
        
        {isLocked && <LockedCourseOverlay />}

        {/* Status Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 z-20">
          {course.is_free_trial && <FreeTrialBadge />}
          {isLocked && <LockedCourseBadge />}
        </div>
        
        {isEnrolled(course.id) && (
          <div className="absolute top-3 right-3 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium z-20">
            Enrolled
          </div>
        )}

        {/* Hover Overlay */}
        {!isLocked && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <Button
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              size="sm"
              onClick={() => navigate(`/app/courses/${course.id}`)}
            >
              <Play className="w-4 h-4 mr-2" />
              View Course
            </Button>
          </div>
        )}
      </div>

      {/* Course Content */}
      <div className="p-6 flex flex-col flex-grow">
        {/* Flexible Content Area */}
        <div className="flex-grow">
          {/* Category and Level */}
          <div className="flex items-center gap-2 mb-3">
            {course.category && (
              <span 
                className="text-xs px-2 py-1 rounded-full font-medium"
                style={{
                  backgroundColor: course.category.color ? `${course.category.color}20` : '#dbeafe',
                  color: course.category.color || '#1d4ed8'
                }}
              >
                {course.category.name}
              </span>
            )}
            {course.difficulty_level && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                {course.difficulty_level}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
            {course.title}
          </h3>

          {/* Description */}
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {course.description}
          </p>
        </div>

        {/* Fixed Bottom Section - Stats and Button */}
        <div className="mt-auto">
          {/* Course Stats - Icons with Tooltips */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <Tooltip content={`Duration: ${formatDuration(course.duration_minutes)}`} position="bottom">
              <div className="flex items-center gap-1 text-gray-500 hover:text-gray-700">
                <Clock className="w-4 h-4" />
              </div>
            </Tooltip>
            <Tooltip content={`${(courseCounts[course.id]?.lessons) ?? (course.lessons?.length || 0)} lessons`} position="bottom">
              <div className="flex items-center gap-1 text-gray-500 hover:text-gray-700">
                <BookOpen className="w-4 h-4" />
              </div>
            </Tooltip>
            <Tooltip content={`${(courseCounts[course.id]?.modules) ?? (course.modules?.length || 0)} modules`} position="bottom">
              <div className="flex items-center gap-1 text-gray-500 hover:text-gray-700">
                <div className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center">
                  <BookOpen className="w-3 h-3 text-blue-600" />
                </div>
              </div>
            </Tooltip>
            {course.creator && (
              <Tooltip 
                content={
                  course.creator.first_name && course.creator.last_name 
                    ? `Creator: ${course.creator.first_name} ${course.creator.last_name}`
                    : `Creator: ${course.creator.email || 'Unknown Creator'}`
                } 
                position="bottom"
              >
                <div className="flex items-center gap-1 text-gray-500 hover:text-gray-700">
                  <Users className="w-4 h-4" />
                </div>
              </Tooltip>
            )}
          </div>

          {/* Action Button */}
          {isLocked ? (
            <div className="space-y-2">
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => navigate('/pricing')}
              >
                <Lock className="w-4 h-4 mr-2" />
                Sign Up for Paid Plan
              </Button>
              <p className="text-xs text-center text-gray-500">
                Paid package required to access this course
              </p>
            </div>
          ) : (
            <Button
              className="w-full"
              variant={isEnrolled(course.id) ? "secondary" : "default"}
              onClick={() => handleEnroll(course.id)}
            >
              {isEnrolled(course.id) ? (
                canContinueLearning(course.id) ? (
                  <>
                    <Award className="w-4 h-4 mr-2" />
                    Continue Learning
                  </>
                ) : (
                  <>
                    <Award className="w-4 h-4 mr-2" />
                    Course Completed
                  </>
                )
              ) : (
                <>
                  <BookOpen className="w-4 h-4 mr-2" />
                  Enroll Now
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>
    );
  };

  // Course list item component
  const CourseListItem = ({ course }) => {
    const isLocked = isFreeTrial && !canAccessCourse(course);

    return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex gap-6">
        {/* Course Image */}
        <div className="relative w-48 h-32 rounded-lg overflow-hidden flex-shrink-0">
          {course.thumbnail_url ? (
            <img
              src={course.thumbnail_url}
              alt={`${course.title} thumbnail`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
              <BookOpen className="w-12 h-12 text-indigo-400" />
            </div>
          )}
          {isLocked && <LockedCourseOverlay />}
        </div>

        {/* Course Details */}
        <div className="flex-1">
          <div className="flex items-start justify-between mb-3">
            <div>
              {/* Badges */}
              <div className="flex items-center gap-2 mb-2">
                {course.is_free_trial && <FreeTrialBadge />}
                {isLocked && <LockedCourseBadge />}
                {course.category && (
                  <span 
                    className="text-xs px-2 py-1 rounded-full font-medium"
                    style={{
                      backgroundColor: course.category.color ? `${course.category.color}20` : '#dbeafe',
                      color: course.category.color || '#1d4ed8'
                    }}
                  >
                    {course.category.name}
                  </span>
                )}
                {course.difficulty_level && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    {course.difficulty_level}
                  </span>
                )}
              </div>

              {/* Title and Description */}
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {course.title}
              </h3>
              <p className="text-gray-600 mb-3 line-clamp-2">
                {course.description}
              </p>
            </div>
          </div>

          {/* Course Stats */}
          <div className="flex items-center gap-6 mb-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{formatDuration(course.duration_minutes)}</span>
            </div>
            <div className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              <span>{(courseCounts[course.id]?.lessons) ?? (course.lessons?.length || 0)} lessons</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center">
                <BookOpen className="w-3 h-3 text-blue-600" />
              </div>
              <span>{(courseCounts[course.id]?.modules) ?? (course.modules?.length || 0)} modules</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{course.enrollments?.length || 0} students</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <ActionButton
                action="view"
                onClick={() => navigate(`/app/courses/${course.id}`)}
                variant="outline"
                size="sm"
              />
            </div>

            {isLocked ? (
              <Button
                variant="secondary"
                onClick={() => navigate('/pricing')}
              >
                <Lock className="w-4 h-4 mr-2" />
                Sign Up for Paid Plan
              </Button>
            ) : (
              <Button
                variant={isEnrolled(course.id) ? "secondary" : "default"}
                onClick={() => handleEnroll(course.id)}
              >
                {isEnrolled(course.id) ? (
                  canContinueLearning(course.id) ? (
                    <>
                      <Award className="w-4 h-4 mr-2" />
                      Continue Learning
                    </>
                  ) : (
                    <>
                      <Award className="w-4 h-4 mr-2" />
                      Course Completed
                    </>
                  )
                ) : (
                  <>
                    <BookOpen className="w-4 h-4 mr-2" />
                    Enroll Now
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
    );
  };

  // Loading state
  if (loading.courses) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="p-8 text-center">
        <div className="text-red-500 mb-4">
          <BookOpen className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Error Loading Courses
        </h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <ActionButton
          action="refresh"
          onClick={() => fetchCourses({ learnerCatalog: true }, user?.id ?? null)}
        >
          Try Again
        </ActionButton>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageTitle
          title="Course Catalog"
          subtitle="Discover courses to advance your skills and career"
        />

        {/* View Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="w-4 h-4" />
          </Button>
          
          {/* Course Management Button */}
          {user && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/app/courses/management')}
            >
              <Settings className="w-4 h-4 mr-2" />
              Manage Courses
            </Button>
          )}
        </div>
      </div>

      {/* Free Trial Banner */}
      {isFreeTrial && user && (
        <Card className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Lock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  You&apos;re on the Free Trial
                </p>
                <p className="text-xs text-gray-600">
                  Some courses are visible but require a paid package to access. Sign up for a paid plan to unlock 
                  the full catalog, quizzes, and certificates.
                </p>
              </div>
            </div>
            <Button size="sm" onClick={() => navigate('/pricing')} className="flex-shrink-0">
              View Paid Plans
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search courses..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Category Filter */}
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          {/* Level Filter */}
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
          >
            {levels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.name}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            {sortOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <p className="text-gray-600">
          Showing {sortedCourses.length} of {courses.length} courses
        </p>

        {filteredCourses.length !== courses.length && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setSelectedCategory("all");
              setSelectedLevel("all");
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Course Grid/List */}
      {sortedCourses.length === 0 ? (
        <EmptyState
          icon="book"
          title="No courses found"
          description="Try adjusting your search criteria or browse all courses"
          actionText="View All Courses"
          action={() => {
            setSearchTerm("");
            setSelectedCategory("all");
            setSelectedLevel("all");
          }}
        />
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
              : "space-y-4"
          }
        >
          {sortedCourses.map((course) =>
            viewMode === "grid" ? (
              <CourseCard key={course.id} course={course} />
            ) : (
              <CourseListItem key={course.id} course={course} />
            )
          )}
        </div>
      )}

      {/* Load More - Only show if there are more courses available beyond what's displayed */}
      {/* Currently hidden since all courses are loaded at once */}
      {/* To implement pagination: add state for current page/total count and show when hasMore */}
    </div>
  );
};

export default CourseCatalog;

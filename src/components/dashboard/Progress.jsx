import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  Clock,
  Target,
  Award,
  BookOpen,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Filter,
  Download,
} from "lucide-react";
import Button from "../../components/ui/Button";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { useAuthStore } from "../../store/authStore";
import { useCourseStore } from "../../store/courseStore";
import { supabase, TABLES } from "../../lib/supabase";

const Progress = () => {
  const { profile, user } = useAuthStore();
  const { certificates, actions: courseActions } = useCourseStore();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30days");
  const [progressData, setProgressData] = useState(null);

  const timeRanges = [
    { id: "7days", name: "Last 7 Days" },
    { id: "30days", name: "Last 30 Days" },
    { id: "90days", name: "Last 90 Days" },
    { id: "year", name: "This Year" },
    { id: "all", name: "All Time" },
  ];

  useEffect(() => {
    const loadProgressData = async () => {
      if (!user?.id) return;

      setLoading(true);
      try {
        // Fetch certificates first
        await courseActions.fetchCertificates(user.id);

        // Calculate date range
        const now = new Date();
        let startDate;
        switch (timeRange) {
          case '7days':
            startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30days':
            startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
            break;
          case '90days':
            startDate = new Date(now - 90 * 24 * 60 * 60 * 1000);
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          case 'all':
          default:
            startDate = new Date(0);
            break;
        }

        // Fetch course enrollments with completion status
        const { data: enrollments, error: enrollmentError } = await supabase
          .from('course_enrollments')
          .select(`
            id,
            course_id,
            status,
            progress_percentage,
            completed_at,
            created_at,
            courses (
              id,
              title,
              category_id,
              category:${TABLES.COURSE_CATEGORIES}(name),
              duration_minutes
            )
          `)
          .eq('user_id', user.id);

        if (enrollmentError) throw enrollmentError;

        // Fetch lesson progress for time tracking
        const { data: lessonProgress, error: progressError } = await supabase
          .from('lesson_progress')
          .select('time_spent_seconds, completed, last_activity_at, lesson_id')
          .eq('user_id', user.id);

        if (progressError) throw progressError;

        // Fetch quiz attempts for average score
        const { data: quizAttempts, error: quizError } = await supabase
          .from('quiz_attempts')
          .select('score')
          .eq('user_id', user.id)
          .gte('created_at', startDate.toISOString());

        if (quizError) throw quizError;

        // Calculate overview metrics
        const totalTimeSeconds = (lessonProgress || []).reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0);
        const totalHours = Math.round(totalTimeSeconds / 3600);

        const coursesCompleted = (enrollments || []).filter(e => e.status === 'completed').length;
        const coursesInProgress = (enrollments || []).filter(e => e.status === 'in_progress').length;
        const certificatesCount = certificates.length;

        const averageScore = (quizAttempts && quizAttempts.length > 0)
          ? Math.round(quizAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / quizAttempts.length)
          : 0;

        // Calculate learning streak
        const sortedActivity = [...(lessonProgress || [])]
          .filter(p => p.last_activity_at)
          .sort((a, b) => new Date(b.last_activity_at) - new Date(a.last_activity_at));

        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 0;
        let lastDate = null;

        sortedActivity.forEach(activity => {
          const activityDate = new Date(activity.last_activity_at);
          const dayStart = new Date(activityDate.getFullYear(), activityDate.getMonth(), activityDate.getDate());

          if (!lastDate) {
            tempStreak = 1;
            lastDate = dayStart;
          } else {
            const diffDays = Math.floor((lastDate - dayStart) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
              tempStreak++;
            } else if (diffDays > 1) {
              longestStreak = Math.max(longestStreak, tempStreak);
              tempStreak = 1;
            }
            lastDate = dayStart;
          }
        });

        if (sortedActivity.length > 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const lastActivityDate = new Date(sortedActivity[0].last_activity_at);
          lastActivityDate.setHours(0, 0, 0, 0);
          const daysSinceLastActivity = Math.floor((today - lastActivityDate) / (1000 * 60 * 60 * 24));

          if (daysSinceLastActivity <= 1) {
            currentStreak = tempStreak;
          }
          longestStreak = Math.max(longestStreak, tempStreak);
        }

        // Calculate weekly activity (last 7 days)
        const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date(now);
          date.setDate(date.getDate() - (6 - i));
          return date;
        });

        const weeklyActivity = last7Days.map(date => {
          const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          const dayEnd = new Date(dayStart);
          dayEnd.setDate(dayEnd.getDate() + 1);

          const dayProgress = (lessonProgress || []).filter(p => {
            const activityDate = new Date(p.last_activity_at);
            return activityDate >= dayStart && activityDate < dayEnd;
          });

          const dayEnrollments = (enrollments || []).filter(e => {
            const completedDate = e.completed_at ? new Date(e.completed_at) : null;
            return completedDate && completedDate >= dayStart && completedDate < dayEnd;
          });

          const hours = dayProgress.reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0) / 3600;
          const courses = dayEnrollments.length;

          return {
            day: weekDays[date.getDay()],
            hours: Math.round(hours * 10) / 10,
            courses
          };
        });

        // Calculate monthly progress (last 6 months)
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const last6Months = Array.from({ length: 6 }, (_, i) => {
          const date = new Date(now);
          date.setMonth(date.getMonth() - (5 - i));
          return date;
        });

        const monthlyProgress = last6Months.map(date => {
          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

          const monthEnrollments = (enrollments || []).filter(e => {
            const completedDate = e.completed_at ? new Date(e.completed_at) : null;
            return completedDate && completedDate >= monthStart && completedDate <= monthEnd;
          });

          const monthProgress = (lessonProgress || []).filter(p => {
            const activityDate = new Date(p.last_activity_at);
            return activityDate >= monthStart && activityDate <= monthEnd;
          });

          const hours = Math.round(monthProgress.reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0) / 3600);

          return {
            month: monthNames[date.getMonth()],
            completed: monthEnrollments.length,
            hours
          };
        });

        // Calculate skill progress by category
        const categoryMap = {};
        (enrollments || []).forEach(e => {
          const categoryName = e.courses?.category?.name;
          if (!e.courses || !categoryName) return;

          const category = categoryName;
          if (!categoryMap[category]) {
            categoryMap[category] = {
              skill: category,
              courses: 0,
              completedCourses: 0,
              hours: 0,
              level: 0
            };
          }

          categoryMap[category].courses++;
          if (e.status === 'completed') {
            categoryMap[category].completedCourses++;
          }
        });

        // Calculate hours per category from lesson progress
        for (const category in categoryMap) {
          const categoryEnrollments = (enrollments || []).filter(
            (e) => e.courses?.category?.name === category
          );
          const categoryLessons = categoryEnrollments.map(e => e.course_id);

          const { data: categoryLessonProgress } = await supabase
            .from('lesson_progress')
            .select('time_spent_seconds, lessons!inner(course_id)')
            .eq('user_id', user.id)
            .in('lessons.course_id', categoryLessons);

          const categoryHours = Math.round(
            ((categoryLessonProgress || []).reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0) / 3600)
          );

          categoryMap[category].hours = categoryHours;
          categoryMap[category].level = Math.min(
            100,
            Math.round((categoryMap[category].completedCourses / categoryMap[category].courses) * 100)
          );
        }

        const skillProgress = Object.values(categoryMap).slice(0, 6);

        // Calculate recent activity
        const recentCompletions = (enrollments || [])
          .filter(e => e.status === 'completed' && e.completed_at)
          .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
          .slice(0, 2)
          .map(e => ({
            type: 'completion',
            title: `Completed "${e.courses?.title || 'Course'}"`,
            date: e.completed_at,
            points: 150
          }));

        const recentCertificates = [...certificates]
          .sort((a, b) => new Date(b.issued_at) - new Date(a.issued_at))
          .slice(0, 2)
          .map(cert => ({
            type: 'certificate',
            title: `Earned ${cert.course_title || 'Course'} Certificate`,
            date: cert.issued_at,
            points: 200
          }));

        const recentActivity = [...recentCompletions, ...recentCertificates]
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 4);

        // Build goals from actual data
        const goals = [];

        if (coursesInProgress > 0) {
          goals.push({
            id: 1,
            title: "Complete courses in progress",
            target: coursesInProgress + coursesCompleted,
            current: coursesCompleted,
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            type: "courses"
          });
        }

        if (totalHours < 100) {
          goals.push({
            id: 2,
            title: "Reach 100 hours of learning",
            target: 100,
            current: totalHours,
            deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
            type: "hours"
          });
        }

        if (certificatesCount < 10) {
          goals.push({
            id: 3,
            title: "Earn 10 certificates",
            target: 10,
            current: certificatesCount,
            deadline: new Date(now.getFullYear(), 11, 31).toISOString(),
            type: "certificates"
          });
        }

        setProgressData({
          overview: {
            totalHours,
            coursesCompleted,
            coursesInProgress,
            certificates: certificatesCount,
            currentStreak,
            longestStreak,
            averageScore,
            rank: totalHours >= 100 ? "Advanced Learner" : totalHours >= 50 ? "Intermediate Learner" : "Beginner"
          },
          weeklyActivity,
          monthlyProgress,
          skillProgress,
          recentActivity,
          goals
        });
      } catch (error) {
        console.error('Error loading progress data:', error);
        // Set empty data on error
        setProgressData({
          overview: {
            totalHours: 0,
            coursesCompleted: 0,
            coursesInProgress: 0,
            certificates: 0,
            currentStreak: 0,
            longestStreak: 0,
            averageScore: 0,
            rank: "New Learner"
          },
          weeklyActivity: [],
          monthlyProgress: [],
          skillProgress: [],
          recentActivity: [],
          goals: []
        });
      } finally {
        setLoading(false);
      }
    };

    loadProgressData();
  }, [timeRange, user?.id]);

  const getActivityIcon = (type) => {
    switch (type) {
      case "completion":
        return <BookOpen className="h-4 w-4 text-green-600" />;
      case "certificate":
        return <Award className="h-4 w-4 text-yellow-600" />;
      case "milestone":
        return <Target className="h-4 w-4 text-purple-600" />;
      case "streak":
        return <Zap className="h-4 w-4 text-blue-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getSkillColor = (level) => {
    if (level >= 80) return "bg-green-500";
    if (level >= 60) return "bg-blue-500";
    if (level >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getSkillLabel = (level) => {
    if (level >= 80) return "Expert";
    if (level >= 60) return "Intermediate";
    if (level >= 40) return "Beginner";
    return "Learning";
  };

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-dark mb-2">
            Learning Progress
          </h1>
          <p className="text-text-medium">
            Track your learning journey and celebrate your achievements
          </p>
        </div>
        <div className="flex items-center space-x-3 mt-4 lg:mt-0">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="input w-auto"
          >
            {timeRanges.map((range) => (
              <option key={range.id} value={range.id}>
                {range.name}
              </option>
            ))}
          </select>
          <Button variant="secondary">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-text-medium">Total Hours</p>
              <p className="text-2xl font-semibold text-text-dark">
                {progressData.overview.totalHours}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <BookOpen className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-text-medium">Courses Completed</p>
              <p className="text-2xl font-semibold text-text-dark">
                {progressData.overview.coursesCompleted}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Award className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-text-medium">Certificates</p>
              <p className="text-2xl font-semibold text-text-dark">
                {progressData.overview.certificates}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-text-medium">Average Score</p>
              <p className="text-2xl font-semibold text-text-dark">
                {progressData.overview.averageScore}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Weekly Activity */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-text-dark">
                Weekly Activity
              </h2>
              <div className="flex items-center space-x-4 text-sm text-text-medium">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-primary rounded mr-2" />
                  <span>Hours</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-primary-light rounded mr-2" />
                  <span>Courses</span>
                </div>
              </div>
            </div>

            <div className="h-64 flex items-end justify-between space-x-2">
              {progressData.weeklyActivity.map((day, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full max-w-16 space-y-1 mb-2">
                    <div
                      className="bg-primary rounded-t"
                      style={{
                        height: `${(day.hours / 4) * 200}px`,
                        minHeight: "4px",
                      }}
                    />
                    <div
                      className="bg-primary-light rounded-t"
                      style={{
                        height: `${(day.courses / 2) * 100}px`,
                        minHeight: day.courses > 0 ? "8px" : "2px",
                      }}
                    />
                  </div>
                  <div className="text-xs text-text-medium">{day.day}</div>
                  <div className="text-xs text-text-light">{day.hours}h</div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Progress */}
          <div className="card">
            <h2 className="text-xl font-semibold text-text-dark mb-6">
              Monthly Progress
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-background-dark">
                    <th className="text-left py-2">Month</th>
                    <th className="text-left py-2">Courses Completed</th>
                    <th className="text-left py-2">Hours Studied</th>
                    <th className="text-left py-2">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {progressData.monthlyProgress.map((month, index) => (
                    <tr
                      key={index}
                      className="border-b border-background-light"
                    >
                      <td className="py-3 font-medium text-text-dark">
                        {month.month}
                      </td>
                      <td className="py-3 text-text-medium">
                        {month.completed}
                      </td>
                      <td className="py-3 text-text-medium">{month.hours}h</td>
                      <td className="py-3">
                        <div className="flex items-center">
                          <div className="progress-bar w-20 mr-2">
                            <div
                              className="progress-fill"
                              style={{ width: `${(month.hours / 50) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm text-text-medium">
                            {month.hours}h
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Skill Progress */}
          <div className="card">
            <h2 className="text-xl font-semibold text-text-dark mb-6">
              Skill Development
            </h2>
            <div className="space-y-4">
              {progressData.skillProgress.map((skill, index) => (
                <div
                  key={index}
                  className="border border-background-dark rounded-lg p-4"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-text-dark">
                      {skill.skill}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getSkillColor(skill.level)}`}
                      >
                        {getSkillLabel(skill.level)}
                      </span>
                      <span className="text-sm font-medium text-text-dark">
                        {skill.level}%
                      </span>
                    </div>
                  </div>
                  <div className="progress-bar mb-2">
                    <div
                      className="progress-fill"
                      style={{ width: `${skill.level}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-text-light">
                    <span>{skill.courses} courses completed</span>
                    <span>{skill.hours} hours practiced</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Learning Streak */}
          <div className="card">
            <h3 className="text-lg font-semibold text-text-dark mb-4">
              Learning Streak
            </h3>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">
                {progressData.overview.currentStreak}
              </div>
              <p className="text-sm text-text-medium mb-4">Days in a row</p>
              <div className="flex justify-center">
                <Zap className="h-12 w-12 text-yellow-500" />
              </div>
              <p className="text-xs text-text-light mt-2">
                Longest streak: {progressData.overview.longestStreak} days
              </p>
            </div>
          </div>

          {/* Learning Goals */}
          <div className="card">
            <h3 className="text-lg font-semibold text-text-dark mb-4">
              Learning Goals
            </h3>
            <div className="space-y-4">
              {progressData.goals.map((goal) => (
                <div
                  key={goal.id}
                  className="border border-background-dark rounded-lg p-3"
                >
                  <h4 className="font-medium text-text-dark text-sm mb-2">
                    {goal.title}
                  </h4>
                  <div className="flex justify-between text-xs text-text-medium mb-1">
                    <span>
                      {goal.current} of {goal.target} {goal.type}
                    </span>
                    <span>Due {formatDate(goal.deadline)}</span>
                  </div>
                  <div className="progress-bar h-1">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${(goal.current / goal.target) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <Link to="/goals" className="block mt-4">
              <Button variant="ghost" size="sm" className="w-full">
                Manage Goals
              </Button>
            </Link>
          </div>

          {/* Recent Activity */}
          <div className="card">
            <h3 className="text-lg font-semibold text-text-dark mb-4">
              Recent Activity
            </h3>
            <div className="space-y-3">
              {progressData.recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 p-2 hover:bg-background-light rounded-lg transition-colors"
                >
                  <div className="mt-1">{getActivityIcon(activity.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-dark">{activity.title}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-text-light">
                        {formatDate(activity.date)}
                      </span>
                      <span className="text-xs font-medium text-primary">
                        +{activity.points} pts
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Learner Rank */}
          <div className="card bg-gradient-to-br from-primary-light to-background-medium">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-text-dark mb-2">
                {progressData.overview.rank}
              </h3>
              <p className="text-sm text-text-medium mb-3">
                You're in the top 15% of learners
              </p>
              <Button size="sm" variant="primary">
                View Leaderboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Progress;

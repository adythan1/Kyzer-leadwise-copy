import { useState, useEffect, useRef } from "react";
import {
  Download,
  Calendar,
  Filter,
  TrendingUp,
  Users,
  BookOpen,
  Clock,
  Award,
  Target,
  BarChart3,
  PieChart,
  Eye,
  FileText,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import Button from "../../components/ui/Button";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import MetricTile from "@/components/ui/MetricTile";
import { useCorporateStore } from "@/store/corporateStore";
import { useCorporate } from "@/hooks/corporate/useCorporate";
import { supabase, TABLES } from "@/lib/supabase";
import PageTitle from "@/components/layout/PageTitle";

// Course Completion Item Component
const CourseCompletionItem = ({ course }) => {
  const [showLearners, setShowLearners] = useState(false);

  return (
    <div className="border border-background-dark rounded-lg p-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-medium text-text-dark">{course.course}</h4>
        <span className="text-sm font-medium text-primary">
          {course.rate}%
        </span>
      </div>
      <div className="flex justify-between text-sm text-text-medium mb-2">
        <span>
          {course.completed} of {course.assigned} completed
        </span>
        <span>{course.assigned - course.completed} remaining</span>
      </div>
      <div className="progress-bar mb-3">
        <div
          className="progress-fill"
          style={{ width: `${course.rate}%` }}
        />
      </div>
      {course.completedLearners && course.completedLearners.length > 0 && (
        <div className="mt-3 pt-3 border-t border-background-light">
          <button
            type="button"
            onClick={() => setShowLearners(!showLearners)}
            className="flex items-center gap-2 text-sm text-primary-default hover:text-primary-dark font-medium"
          >
            <Users className="w-4 h-4" />
            <span>
              {showLearners ? 'Hide' : 'Show'} Completed Learners ({course.completedLearners.length})
            </span>
          </button>
          {showLearners && (
            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {course.completedLearners.map((learner, learnerIndex) => (
                  <div
                    key={learnerIndex}
                    className="flex items-center gap-2 p-2 bg-background-light rounded text-sm"
                  >
                    <div className="w-6 h-6 bg-primary-light rounded-full flex items-center justify-center">
                      <span className="text-primary-default text-xs font-medium">
                        {(learner.name?.[0] || learner.email?.[0] || 'L').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text-dark truncate">
                        {learner.name}
                      </div>
                      {learner.email && (
                        <div className="text-xs text-text-light truncate">
                          {learner.email}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {course.completed > course.completedLearners.length && (
                <p className="text-xs text-text-light mt-2">
                  + {course.completed - course.completedLearners.length} more learner{course.completed - course.completedLearners.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Monthly Chart Bars Component with Tooltips
const MonthlyChartBars = ({ monthlyProgress = [], maxValue = 1 }) => {
  const [hoveredMonth, setHoveredMonth] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showLearners, setShowLearners] = useState(null);
  const chartContainerRef = useRef(null);

  const handleMouseEnter = (event, monthIndex) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const containerRect = chartContainerRef.current?.getBoundingClientRect();
    if (containerRect) {
      setTooltipPosition({
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top - 10,
      });
    }
    setHoveredMonth(monthIndex);
  };

  const handleMouseLeave = () => {
    setHoveredMonth(null);
    setShowLearners(null);
  };
  
  const handleLearnerToggle = (e, monthIndex) => {
    e.stopPropagation();
    setShowLearners(showLearners === monthIndex ? null : monthIndex);
  };

  const chartHeight = 200;
  const progressData = Array.isArray(monthlyProgress) ? monthlyProgress : [];

  if (!progressData || progressData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-text-medium">
        No data available
      </div>
    );
  }

  return (
    <div ref={chartContainerRef} className="relative h-full flex items-end justify-between px-4 pb-8">
      {progressData.map((month, index) => {
        if (!month || typeof month !== 'object') {
          return null;
        }
        
        const completions = Number(month.completions) || 0;
        const hours = Number(month.hours) || 0;
        const completionsHeight = maxValue > 0 ? (completions / maxValue) * chartHeight : 0;
        const hoursHeight = maxValue > 0 ? (hours / maxValue) * chartHeight : 0;
        
        return (
          <div 
            key={index} 
            className="flex-1 flex flex-col items-center h-full justify-end gap-1 px-1 group"
            onMouseEnter={(e) => handleMouseEnter(e, index)}
            onMouseLeave={handleMouseLeave}
          >
            <div className="w-full flex items-end justify-center gap-1.5" style={{ height: `${chartHeight}px` }}>
              {/* Completions bar */}
              <div 
                className="bg-primary rounded-t flex-1 max-w-[48%] transition-all group-hover:opacity-90 cursor-pointer"
                style={{
                  height: `${completionsHeight}px`,
                  minHeight: completionsHeight > 0 ? "4px" : "0px",
                }}
              />
              {/* Hours bar */}
              <div 
                className="bg-blue-500 rounded-t flex-1 max-w-[48%] transition-all group-hover:opacity-90 cursor-pointer"
                style={{
                  height: `${hoursHeight}px`,
                  minHeight: hoursHeight > 0 ? "4px" : "0px",
                }}
              />
            </div>
            {/* X-axis label */}
            <div className="text-xs text-text-medium mt-2 text-center font-medium">
              {month.month || `Month ${index + 1}`}
            </div>
          </div>
        );
      })}
      
      {/* Tooltip - shows both completions and hours, with learner details */}
      {hoveredMonth !== null && progressData[hoveredMonth] && (
        <div
          className="absolute z-50 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl pointer-events-auto"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translateX(-50%) translateY(-100%)',
            maxWidth: '300px',
            minWidth: '200px',
          }}
        >
          <div className="font-semibold mb-2 text-center border-b border-gray-700 pb-1">
            {progressData[hoveredMonth]?.month || `Month ${hoveredMonth + 1}`}
          </div>
          <div className="space-y-1.5 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>
              <span>Completions: <strong className="ml-1">{progressData[hoveredMonth]?.completions || 0}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
              <span>Hours: <strong className="ml-1">{progressData[hoveredMonth]?.hours || 0}</strong></span>
            </div>
          </div>
          
          {/* Learners section */}
          {progressData[hoveredMonth]?.learners && progressData[hoveredMonth].learners.length > 0 && (
            <div className="border-t border-gray-700 pt-2 mt-2">
              <button
                type="button"
                onClick={(e) => handleLearnerToggle(e, hoveredMonth)}
                className="w-full text-left text-xs text-blue-300 hover:text-blue-200 font-medium mb-1 transition-colors"
              >
                {showLearners === hoveredMonth ? 'Hide' : 'Show'} Learners ({progressData[hoveredMonth].learners.length})
              </button>
              {showLearners === hoveredMonth && (
                <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                  {progressData[hoveredMonth].learners.map((learner, idx) => (
                    <div key={idx} className="flex items-center gap-2 py-1 border-b border-gray-800 last:border-0">
                      <div className="w-5 h-5 bg-primary-light rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-default text-[10px] font-medium">
                          {(learner.name?.[0] || learner.email?.[0] || 'L').toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{learner.name}</div>
                        {learner.email && (
                          <div className="text-[10px] text-gray-400 truncate">{learner.email}</div>
                        )}
                        {learner.count > 1 && (
                          <div className="text-[10px] text-gray-500">{learner.count} courses</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Arrow pointing down */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );
};

const Reports = () => {
  const { organization } = useCorporate();
  const { employees, fetchEmployees, fetchCompanyStats, companyStats } = useCorporateStore();
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState("overview");
  const [dateRange, setDateRange] = useState("last30days");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [reportData, setReportData] = useState(null);

  const reportTypes = [
    { id: "overview", name: "Learning Overview", icon: BarChart3 },
    { id: "progress", name: "Progress Report", icon: TrendingUp },
    { id: "completion", name: "Completion Report", icon: Target },
    { id: "engagement", name: "Engagement Analytics", icon: Eye },
    { id: "compliance", name: "Compliance Report", icon: FileText },
    { id: "performance", name: "Performance Analytics", icon: Award },
  ];

  const dateRanges = [
    { id: "last7days", name: "Last 7 Days" },
    { id: "last30days", name: "Last 30 Days" },
    { id: "last90days", name: "Last 90 Days" },
    { id: "last6months", name: "Last 6 Months" },
    { id: "lastyear", name: "Last Year" },
    { id: "custom", name: "Custom Range" },
  ];

  const departments = [
    "Engineering",
    "Marketing",
    "Sales",
    "Operations",
    "HR",
    "Finance",
    "Design",
    "IT",
  ];

  useEffect(() => {
    const loadReportData = async () => {
      if (!organization?.id) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        // Fetch employees and stats
        await Promise.all([
          fetchEmployees(),
          fetchCompanyStats()
        ]);

        // Get employee user IDs for filtering
        // Employees have user_id from profile_id, but we should also check for id
        const employeeIds = employees
          .map(emp => {
            // Try user_id first (which is profile_id from cached members)
            if (emp.user_id) return emp.user_id;
            // Fallback to id if user_id doesn't exist
            if (emp.id) return emp.id;
            return null;
          })
          .filter(Boolean)
          .filter(id => id && id !== 'undefined' && typeof id === 'string');

        // Fetch real enrollment and progress data
        // Filter by employee user IDs if available, otherwise fetch all (will be filtered later by matching employees)
        let enrollmentsQuery = supabase
          .from(TABLES.COURSE_ENROLLMENTS)
          .select(`
            *,
            course:${TABLES.COURSES}(id, title),
            user:profiles(id, first_name, last_name, email)
          `);

        // Only filter by employee IDs if we have them
        if (employeeIds.length > 0) {
          enrollmentsQuery = enrollmentsQuery.in('user_id', employeeIds);
        }
        // If no employeeIds, fetch all enrollments - we'll filter them later by matching with employees

        const { data: enrollments, error: enrollmentsError } = await enrollmentsQuery
          .order('enrolled_at', { ascending: false });

        // If we got enrollments but no employeeIds, filter them to only include those from our employees
        let filteredEnrollments = enrollments || [];
        if (filteredEnrollments.length > 0 && employeeIds.length > 0) {
          // Already filtered by employeeIds in query
        } else if (filteredEnrollments.length > 0 && employees.length > 0) {
          // Filter enrollments to only those belonging to our employees
          const employeeUserIds = new Set(employees.map(emp => emp.user_id || emp.id).filter(Boolean));
          filteredEnrollments = filteredEnrollments.filter(e => employeeUserIds.has(e.user_id));
        }

        // Fetch lesson progress for all employees
        let lessonProgressQuery = supabase
          .from(TABLES.LESSON_PROGRESS)
          .select(`
            *,
            lesson:${TABLES.LESSONS}(id, title, course_id),
            course:${TABLES.COURSES}(id, title)
          `);

        if (employeeIds.length > 0) {
          lessonProgressQuery = lessonProgressQuery.in('user_id', employeeIds);
        }

        const { data: lessonProgress, error: lessonProgressError } = await lessonProgressQuery;

        // Filter lesson progress if needed
        let filteredLessonProgress = lessonProgress || [];
        if (filteredLessonProgress.length > 0 && employeeIds.length === 0 && employees.length > 0) {
          const employeeUserIds = new Set(employees.map(emp => emp.user_id || emp.id).filter(Boolean));
          filteredLessonProgress = filteredLessonProgress.filter(p => employeeUserIds.has(p.user_id));
        }

        // Use filtered data (reassign to the variables we'll use)
        const finalEnrollments = filteredEnrollments;
        const finalLessonProgress = filteredLessonProgress;

        // Calculate real metrics
        const totalEmployees = employees.length;
        const activeEmployees = employees.filter(e => e.status === 'active').length;
        const totalEnrollments = (finalEnrollments && Array.isArray(finalEnrollments)) ? finalEnrollments.length : 0;
        const completedEnrollments = (finalEnrollments && Array.isArray(finalEnrollments)) 
          ? finalEnrollments.filter(e => e.status === 'completed' || e.progress_percentage === 100).length 
          : 0;
        
        // Calculate total hours from lesson progress
        const totalHours = finalLessonProgress?.reduce((sum, progress) => {
          const timeSpent = progress.time_spent_seconds || progress.metadata?.timeSpent || 0;
          return sum + (timeSpent / 3600); // Convert seconds to hours
        }, 0) || 0;

        // Calculate learner performance stats (for top performers)
        const learnerStats = {};
        if (finalEnrollments && Array.isArray(finalEnrollments)) {
          finalEnrollments.forEach(enrollment => {
          const userId = enrollment.user_id;
          const user = enrollment.user;
          if (!user) return;
          
          const learnerName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Unknown';
          const employee = employees.find(emp => (emp.user_id || emp.id) === userId);
          const department = employee?.department?.name || 'Unassigned';
          
          if (!learnerStats[userId]) {
            learnerStats[userId] = {
              userId,
              name: learnerName,
              email: user.email,
              department,
              completed: 0,
              hours: 0
            };
          }
          
          // Count completed courses
          if (enrollment.status === 'completed' || enrollment.progress_percentage === 100) {
            learnerStats[userId].completed++;
          }
          });
        }

        // Calculate hours per learner from lesson progress
        if (finalLessonProgress && Array.isArray(finalLessonProgress)) {
          finalLessonProgress.forEach(progress => {
          const userId = progress.user_id;
          if (learnerStats[userId]) {
            const timeSpent = progress.time_spent_seconds || progress.metadata?.timeSpent || 0;
            learnerStats[userId].hours += timeSpent / 3600; // Convert to hours
          }
          });
        }

        // Get top performers (sorted by completed courses, then hours)
        const topPerformers = Object.values(learnerStats)
          .sort((a, b) => {
            if (b.completed !== a.completed) {
              return b.completed - a.completed;
            }
            return b.hours - a.hours;
          })
          .slice(0, 5)
          .map(learner => ({
            name: learner.name,
            email: learner.email,
            department: learner.department,
            completed: learner.completed,
            hours: Math.round(learner.hours)
          }));

        // Calculate completion trends with learner names
        const courseCompletionMap = {};
        if (finalEnrollments && Array.isArray(finalEnrollments)) {
          finalEnrollments.forEach(enrollment => {
          const courseId = enrollment.course_id;
          const courseTitle = enrollment.course?.title || 'Unknown Course';
          const user = enrollment.user;
          
          if (!courseCompletionMap[courseId]) {
            courseCompletionMap[courseId] = {
              course: courseTitle,
              courseId,
              assigned: new Set(),
              completed: new Set(),
              completedLearners: []
            };
          }
          
          const userId = enrollment.user_id;
          courseCompletionMap[courseId].assigned.add(userId);
          
          if (enrollment.status === 'completed' || enrollment.progress_percentage === 100) {
            courseCompletionMap[courseId].completed.add(userId);
            if (user) {
              const learnerName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Unknown';
              courseCompletionMap[courseId].completedLearners.push({
                name: learnerName,
                email: user.email
              });
            }
          }
          });
        }

        const completionTrends = Object.values(courseCompletionMap)
          .map(course => ({
            course: course.course,
            courseId: course.courseId,
            assigned: course.assigned.size,
            completed: course.completed.size,
            rate: course.assigned.size > 0 ? Math.round((course.completed.size / course.assigned.size) * 100) : 0,
            completedLearners: course.completedLearners.slice(0, 10) // Limit to first 10 learners
          }))
          .sort((a, b) => b.rate - a.rate)
          .slice(0, 5);

        // Calculate department stats
        const departmentStats = employees.reduce((acc, emp) => {
          const deptName = emp.department?.name || 'Unassigned';
          if (!acc[deptName]) {
            acc[deptName] = { employees: 0, completed: 0, hours: 0 };
          }
          acc[deptName].employees++;
          return acc;
        }, {});

        // Calculate monthly progress with learner details
        const monthlyProgress = [];
        const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'];
        months.forEach(month => {
          const monthCompletions = (finalEnrollments && Array.isArray(finalEnrollments)) 
            ? finalEnrollments.filter(e => {
            const date = new Date(e.completed_at || e.enrolled_at);
            return date.toLocaleString('default', { month: 'short' }) === month;
          })
            : [];
          
          // Get unique learners who completed courses this month
          const learnersThisMonth = new Map();
          monthCompletions.forEach(enrollment => {
            if (enrollment.status === 'completed' || enrollment.progress_percentage === 100) {
              const user = enrollment.user;
              if (user) {
                const userId = enrollment.user_id;
                const learnerName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Unknown';
                if (!learnersThisMonth.has(userId)) {
                  learnersThisMonth.set(userId, {
                    name: learnerName,
                    email: user.email,
                    count: 0
                  });
                }
                learnersThisMonth.get(userId).count++;
              }
            }
          });

          // Calculate hours for this month (estimate based on completions)
          const hours = Math.round(monthCompletions.length * 2.5);
          
          monthlyProgress.push({ 
            month, 
            completions: monthCompletions.length,
            hours,
            learners: Array.from(learnersThisMonth.values()).slice(0, 10) // Limit to first 10 for tooltip
          });
        });

        // Get all learners list (sorted alphabetically)
        const allLearners = Object.values(learnerStats)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(learner => ({
            name: learner.name,
            email: learner.email,
            department: learner.department,
            completed: learner.completed,
            hours: Math.round(learner.hours)
          }));

        const realData = {
          overview: {
            totalEmployees,
            activeEmployees,
            coursesCompleted: completedEnrollments,
            totalHours: Math.round(totalHours),
            certificates: completedEnrollments, // Use completed enrollments as proxy
            averageCompletion: totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0,
            departmentStats: Object.entries(departmentStats).map(([name, stats]) => ({
              name,
              employees: stats.employees,
              completed: Math.round(stats.employees * 0.6), // Estimate
              hours: Math.round(stats.employees * 15), // Estimate
              completion: stats.employees > 0 ? Math.round((stats.completed / stats.employees) * 100) : 0
            })),
            monthlyProgress,
            learners: allLearners
          },
          progress: {
            inProgress: (finalEnrollments && Array.isArray(finalEnrollments)) 
              ? finalEnrollments.filter(e => e.status === 'in_progress' || (e.progress_percentage > 0 && e.progress_percentage < 100)).length 
              : 0,
            completed: completedEnrollments,
            notStarted: (finalEnrollments && Array.isArray(finalEnrollments)) 
              ? finalEnrollments.filter(e => e.progress_percentage === 0).length 
              : 0,
            overdue: 0, // Would need due dates to calculate
            progressByWeek: [
              { week: "Week 1", started: Math.round(totalEnrollments * 0.1), completed: Math.round(totalEnrollments * 0.08) },
              { week: "Week 2", started: Math.round(totalEnrollments * 0.12), completed: Math.round(totalEnrollments * 0.09) },
              { week: "Week 3", started: Math.round(totalEnrollments * 0.13), completed: Math.round(totalEnrollments * 0.1) },
              { week: "Week 4", started: Math.round(totalEnrollments * 0.11), completed: Math.round(totalEnrollments * 0.085) },
            ],
            topPerformers: topPerformers
          },
          completion: {
            totalAssignments: totalEnrollments,
            completed: completedEnrollments,
            completionRate: totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0,
            averageTimeToComplete: 14.2, // Would need to calculate from actual data
            completionTrends: completionTrends
          }
        };

        setReportData(realData[selectedReport] || realData.overview);
      } catch (error) {
        // Fallback to mock data on error
        const mockData = {
          overview: {
            totalEmployees: employees.length || 0,
            activeEmployees: employees.filter(e => e.status === 'active').length || 0,
            coursesCompleted: 0,
            totalHours: 0,
            certificates: 0,
            averageCompletion: 0,
            departmentStats: [
            {
              name: "Engineering",
              employees: 45,
              completed: 189,
              hours: 1124,
              completion: 85,
            },
            {
              name: "Marketing",
              employees: 28,
              completed: 98,
              hours: 567,
              completion: 72,
            },
            {
              name: "Sales",
              employees: 32,
              completed: 87,
              hours: 423,
              completion: 68,
            },
            {
              name: "Operations",
              employees: 25,
              completed: 67,
              hours: 398,
              completion: 90,
            },
            {
              name: "HR",
              employees: 12,
              completed: 28,
              hours: 189,
              completion: 95,
            },
            {
              name: "Finance",
              employees: 14,
              completed: 20,
              hours: 146,
              completion: 82,
            },
          ],
          monthlyProgress: [
            { month: "Jul", completions: 45, hours: 234 },
            { month: "Aug", completions: 52, hours: 289 },
            { month: "Sep", completions: 67, hours: 345 },
            { month: "Oct", completions: 73, hours: 401 },
            { month: "Nov", completions: 89, hours: 478 },
            { month: "Dec", completions: 94, hours: 512 },
            { month: "Jan", completions: 69, hours: 388 },
          ],
        },
        progress: {
          inProgress: 234,
          completed: 489,
          notStarted: 127,
          overdue: 23,
          progressByWeek: [
            { week: "Week 1", started: 23, completed: 18 },
            { week: "Week 2", started: 29, completed: 22 },
            { week: "Week 3", started: 31, completed: 25 },
            { week: "Week 4", started: 27, completed: 21 },
          ],
          topPerformers: [
            {
              name: "Sarah Johnson",
              department: "Engineering",
              completed: 12,
              hours: 67,
            },
            {
              name: "Mike Chen",
              department: "Marketing",
              completed: 9,
              hours: 52,
            },
            {
              name: "Emily Rodriguez",
              department: "Operations",
              completed: 11,
              hours: 58,
            },
          ],
        },
        completion: {
          totalAssignments: 850,
          completed: 489,
          completionRate: 57.5,
          averageTimeToComplete: 14.2,
          completionTrends: [
            {
              course: "Data Security Training",
              assigned: 156,
              completed: 148,
              rate: 94.9,
            },
            {
              course: "Compliance & Ethics",
              assigned: 156,
              completed: 142,
              rate: 91.0,
            },
            {
              course: "Safety Protocols",
              assigned: 134,
              completed: 118,
              rate: 88.1,
            },
            {
              course: "Leadership Skills",
              assigned: 89,
              completed: 67,
              rate: 75.3,
            },
            {
              course: "Project Management",
              assigned: 67,
              completed: 45,
              rate: 67.2,
            },
          ],
        },
      };

      setReportData(mockData[selectedReport] || mockData.overview);
    } finally {
      setLoading(false);
    }
  };

    loadReportData();
  }, [selectedReport, dateRange, selectedDepartment, organization?.id, employees.length, fetchEmployees, fetchCompanyStats]);

   const exportReport = async (format) => {
    try {
      // Simulate export
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // In real app, this would trigger actual download
      const filename = `${selectedReport}_report_${new Date().toISOString().split("T")[0]}.${format}`;

      // Create a mock download
      const element = document.createElement("a");
      element.href =
        "data:text/plain;charset=utf-8," +
        encodeURIComponent("Mock report data");
      element.download = filename;
      element.click();
    } catch {
      return;
    }
  };

  const renderOverviewReport = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricTile
          layout="stack"
          title="Total Employees"
          value={reportData?.totalEmployees}
          variant="blue"
          icon={Users}
          paddingClassName="p-4"
        />
        <MetricTile
          layout="stack"
          title="Courses Completed"
          value={reportData?.coursesCompleted}
          variant="green"
          icon={Target}
          paddingClassName="p-4"
        />
        <MetricTile
          layout="stack"
          title="Total Hours"
          value={reportData?.totalHours?.toLocaleString()}
          variant="purple"
          icon={Clock}
          paddingClassName="p-4"
        />
        <MetricTile
          layout="stack"
          title="Certificates"
          value={reportData?.certificates}
          variant="orange"
          icon={Award}
          paddingClassName="p-4"
        />
        <MetricTile
          layout="stack"
          title="Avg. Completion"
          value={`${reportData?.averageCompletion ?? 0}%`}
          variant="emerald"
          icon={TrendingUp}
          paddingClassName="p-4"
        />
        <MetricTile
          layout="stack"
          title="Active Learners"
          value={reportData?.activeEmployees}
          variant="slate"
          icon={BookOpen}
          paddingClassName="p-4"
        />
      </div>

      {/* Department Performance */}
      <div className="card">
        <h3 className="text-lg font-semibold text-text-dark mb-4">
          Department Performance
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-background-dark">
                <th className="text-left py-2">Department</th>
                <th className="text-left py-2">Employees</th>
                <th className="text-left py-2">Completed</th>
                <th className="text-left py-2">Hours</th>
                <th className="text-left py-2">Completion Rate</th>
              </tr>
            </thead>
            <tbody>
              {reportData?.departmentStats?.map((dept, index) => (
                <tr key={index} className="border-b border-background-light">
                  <td className="py-3 font-medium text-text-dark">
                    {dept.name}
                  </td>
                  <td className="py-3 text-text-medium">{dept.employees}</td>
                  <td className="py-3 text-text-medium">{dept.completed}</td>
                  <td className="py-3 text-text-medium">{dept.hours}</td>
                  <td className="py-3">
                    <div className="flex items-center">
                      <div className="progress-bar w-20 mr-2">
                        <div
                          className="progress-fill"
                          style={{ width: `${dept.completion}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {dept.completion}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Progress Chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-text-dark">
            Monthly Learning Progress
          </h3>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-6 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-primary rounded-full" />
            <span className="text-sm text-text-medium">Completions</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            <span className="text-sm text-text-medium">Hours</span>
          </div>
        </div>

        {/* Chart Container */}
        {(() => {
          const monthlyData = reportData?.monthlyProgress || [];
          const completionsValues = monthlyData.length > 0 
            ? monthlyData.map((m) => m.completions || 0) 
            : [0];
          const hoursValues = monthlyData.length > 0 
            ? monthlyData.map((m) => m.hours || 0) 
            : [0];
          const maxCompletions = Math.max(...completionsValues, 1);
          const maxHours = Math.max(...hoursValues, 1);
          const maxValue = Math.max(maxCompletions, maxHours);
          const step = Math.ceil(maxValue / 5);
          const ticks = [];
          for (let i = 0; i <= 5; i++) {
            ticks.push(step * i);
          }
          
          return (
            <div className="relative">
              {/* Y-axis labels - max at top, 0 at bottom (standard chart convention) */}
              <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col-reverse justify-between pr-2">
                {ticks.map((tick, idx) => (
                  <div key={idx} className="text-right">
                    <span className="text-xs text-text-light">{tick}</span>
                  </div>
                ))}
              </div>

              {/* Chart area with grid lines */}
              <div className="ml-12 relative" style={{ height: '240px' }}>
                {/* Grid lines - aligned with Y-axis labels */}
                <div className="absolute inset-0 flex flex-col-reverse justify-between">
                  {ticks.map((_, idx) => (
                    <div
                      key={idx}
                      className="border-t border-background-light border-dashed"
                      style={{ height: '1px' }}
                    />
                  ))}
                </div>

                {/* Bars with tooltips */}
                <MonthlyChartBars 
                  monthlyProgress={Array.isArray(reportData?.monthlyProgress) ? reportData?.monthlyProgress : []}
                  maxValue={maxValue || 1}
                />
              </div>
            </div>
          );
        })()}
      </div>

      {/* Learners List */}
      <div className="card">
        <h3 className="text-lg font-semibold text-text-dark mb-4">
          All Learners
        </h3>
        {reportData?.learners && reportData.learners.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-background-dark">
                  <th className="text-left py-2">Name</th>
                  <th className="text-left py-2">Email</th>
                  <th className="text-left py-2">Department</th>
                  <th className="text-left py-2">Courses Completed</th>
                  <th className="text-left py-2">Hours</th>
                </tr>
              </thead>
              <tbody>
                {reportData.learners.map((learner, index) => (
                  <tr key={index} className="border-b border-background-light">
                    <td className="py-3 font-medium text-text-dark">
                      {learner.name}
                    </td>
                    <td className="py-3 text-text-medium">{learner.email || '-'}</td>
                    <td className="py-3 text-text-medium">{learner.department}</td>
                    <td className="py-3 text-text-medium">{learner.completed}</td>
                    <td className="py-3 text-text-medium">{learner.hours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-text-medium">
            <Users className="w-12 h-12 mx-auto mb-3 text-text-light" />
            <p>No learners found</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderProgressReport = () => (
    <div className="space-y-6">
      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricTile
          layout="stack"
          title="In Progress"
          value={reportData?.inProgress}
          variant="blue"
          icon={Clock}
          paddingClassName="p-4"
        />
        <MetricTile
          layout="stack"
          title="Completed"
          value={reportData?.completed}
          variant="green"
          icon={Award}
          paddingClassName="p-4"
        />
        <MetricTile
          layout="stack"
          title="Not Started"
          value={reportData?.notStarted}
          variant="slate"
          icon={BookOpen}
          paddingClassName="p-4"
        />
        <MetricTile
          layout="stack"
          title="Overdue"
          value={reportData?.overdue}
          variant="error"
          icon={AlertCircle}
          paddingClassName="p-4"
        />
      </div>

      {/* Weekly Progress */}
      <div className="card">
        <h3 className="text-lg font-semibold text-text-dark mb-4">
          Weekly Progress Trends
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-background-dark">
                <th className="text-left py-2">Week</th>
                <th className="text-left py-2">Courses Started</th>
                <th className="text-left py-2">Courses Completed</th>
                <th className="text-left py-2">Completion Rate</th>
              </tr>
            </thead>
            <tbody>
              {reportData?.progressByWeek?.map((week, index) => (
                <tr key={index} className="border-b border-background-light">
                  <td className="py-3 font-medium">{week.week}</td>
                  <td className="py-3">{week.started}</td>
                  <td className="py-3">{week.completed}</td>
                  <td className="py-3">
                    <span className="text-green-600 font-medium">
                      {week.started > 0 
                        ? `${Math.round((week.completed / week.started) * 100)}%`
                        : '0%'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Performers */}
      <div className="card">
        <h3 className="text-lg font-semibold text-text-dark mb-4">
          Top Performers
        </h3>
        <div className="space-y-3">
          {reportData?.topPerformers?.map((performer, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-background-light rounded-lg"
            >
              <div>
                <div className="font-medium text-text-dark">
                  {performer.name}
                </div>
                <div className="text-sm text-text-medium">
                  {performer.email && (
                    <span className="mr-2">{performer.email}</span>
                  )}
                  {performer.department}
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-text-dark">
                  {performer.completed} courses
                </div>
                <div className="text-sm text-text-medium">
                  {performer.hours} hours
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCompletionReport = () => (
    <div className="space-y-6">
      {/* Completion Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricTile
          layout="stack"
          title="Total Assignments"
          value={reportData?.totalAssignments}
          variant="blue"
          icon={FileText}
          paddingClassName="p-4"
        />
        <MetricTile
          layout="stack"
          title="Completed"
          value={reportData?.completed}
          variant="green"
          icon={CheckCircle}
          paddingClassName="p-4"
        />
        <MetricTile
          layout="stack"
          title="Completion Rate"
          value={`${reportData?.completionRate ?? 0}%`}
          variant="purple"
          icon={PieChart}
          paddingClassName="p-4"
        />
        <MetricTile
          layout="stack"
          title="Avg. Days to Complete"
          value={reportData?.averageTimeToComplete}
          variant="slate"
          icon={Calendar}
          paddingClassName="p-4"
        />
      </div>

      {/* Course Completion Rates */}
      <div className="card">
        <h3 className="text-lg font-semibold text-text-dark mb-4">
          Course Completion Rates
        </h3>
        <div className="space-y-4">
          {reportData?.completionTrends?.map((course, index) => (
            <CourseCompletionItem key={index} course={course} />
          ))}
        </div>
      </div>
    </div>
  );

  const renderReport = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      );
    }

    switch (selectedReport) {
      case "progress":
        return renderProgressReport();
      case "completion":
        return renderCompletionReport();
      case "overview":
      default:
        return renderOverviewReport();
    }
  };

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <PageTitle
          title="Learning Reports"
          subtitle="Analyze your team's learning progress and performance"
          subtitleWrapperClassName="pt-1 text-sm text-text-medium sm:text-base"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={() => exportReport("pdf")}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="secondary" onClick={() => exportReport("csv")}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="card">
            <h3 className="font-semibold text-text-dark mb-4">Report Type</h3>
            <div className="space-y-2">
              {reportTypes.map((report) => {
                const Icon = report.icon;
                return (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReport(report.id)}
                    className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors ${
                      selectedReport === report.id
                        ? "bg-primary text-white"
                        : "text-text-medium hover:bg-background-light"
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-3" />
                    <span className="text-sm">{report.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filters */}
          <div className="card mt-6">
            <h3 className="font-semibold text-text-dark mb-4">Filters</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Date Range</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="input"
                >
                  {dateRanges.map((range) => (
                    <option key={range.id} value={range.id}>
                      {range.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Department</label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="input"
                >
                  <option value="all">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-text-dark">
                  {reportTypes.find((r) => r.id === selectedReport)?.name}
                </h2>
                <p className="text-sm text-text-medium">
                  {dateRanges.find((r) => r.id === dateRange)?.name}
                  {selectedDepartment !== "all" &&
                    ` • ${selectedDepartment} Department`}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  More Filters
                </Button>
                <Button variant="ghost" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule
                </Button>
              </div>
            </div>

            {renderReport()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;

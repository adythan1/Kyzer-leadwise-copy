// src/components/corporate/CompanyReports.jsx
import { useState, useEffect } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  Calendar,
  Users,
  BookOpen,
  Award,
  Clock,
  Target,
  Filter,
  RefreshCw
} from 'lucide-react'
import { useCorporateStore, useCurrentCompany, useCompanyStats } from '@/store/corporateStore'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import MetricTile from '@/components/ui/MetricTile'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function CompanyReports() {
  const currentCompany = useCurrentCompany()
  const companyStats = useCompanyStats()
  const { 
    employees,
    courseAssignments,
    fetchEmployees,
    fetchCourseAssignments,
    fetchCompanyStats,
    loading 
  } = useCorporateStore()

  const [activeReport, setActiveReport] = useState('overview')
  const [dateRange, setDateRange] = useState('30days')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadReportData()
  }, [dateRange])

  const loadReportData = async () => {
    setRefreshing(true)
    await Promise.all([
      fetchEmployees(),
      fetchCourseAssignments(),
      fetchCompanyStats()
    ])
    setRefreshing(false)
  }

  const handleExport = (reportType) => {
    // Implementation for exporting reports
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-text-dark">Company Reports</h2>
          <p className="text-text-light">
            Analytics and insights for {currentCompany?.name}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            className="px-3 py-2 border border-background-dark rounded-lg focus:ring-2 focus:ring-primary-default focus:border-primary-default"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
            <option value="90days">Last 3 months</option>
            <option value="1year">Last year</option>
            <option value="all">All time</option>
          </select>
          
          <Button
            variant="secondary"
            onClick={loadReportData}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button
            variant="secondary"
            onClick={() => handleExport(activeReport)}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Report Navigation */}
      <div className="border-b border-background-dark">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'employees', label: 'Employee Progress', icon: Users },
            { id: 'courses', label: 'Course Analytics', icon: BookOpen },
            { id: 'completions', label: 'Completions', icon: Award },
            { id: 'engagement', label: 'Engagement', icon: TrendingUp }
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveReport(tab.id)}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                  ${activeReport === tab.id
                    ? 'border-primary-default text-primary-default'
                    : 'border-transparent text-text-light hover:text-text-medium hover:border-background-dark'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Report Content */}
      <div className="space-y-6">
        {activeReport === 'overview' && <OverviewReport stats={companyStats} />}
        {activeReport === 'employees' && <EmployeeProgressReport employees={employees} />}
        {activeReport === 'courses' && <CourseAnalyticsReport assignments={courseAssignments} />}
        {activeReport === 'completions' && <CompletionsReport />}
        {activeReport === 'engagement' && <EngagementReport />}
      </div>
    </div>
  )
}

// Overview Report Component
function OverviewReport({ stats }) {
  if (!stats) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  const metrics = [
    {
      title: 'Total Employees',
      value: stats.totalEmployees,
      subtitle: `of ${stats.employeeLimit} limit`,
      icon: Users,
      color: 'primary',
      trend: { value: 12, direction: 'up' }
    },
    {
      title: 'Courses Completed',
      value: stats.coursesCompleted,
      subtitle: 'this period',
      icon: Award,
      color: 'success',
      trend: { value: 8, direction: 'up' }
    },
    {
      title: 'In Progress',
      value: stats.coursesInProgress,
      subtitle: 'actively learning',
      icon: BookOpen,
      color: 'warning',
      trend: { value: 3, direction: 'down' }
    },
    {
      title: 'Completion Rate',
      value: `${Math.round((stats.coursesCompleted / (stats.coursesCompleted + stats.coursesInProgress)) * 100) || 0}%`,
      subtitle: 'average completion',
      icon: Target,
      color: 'primary',
      trend: { value: 5, direction: 'up' }
    }
  ]

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <MetricCard key={`metric-${metric.title || index}`} {...metric} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Learning Progress Chart */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-text-dark mb-4">Learning Progress</h3>
            <LearningProgressChart />
          </div>
        </Card>

        {/* Employee Engagement */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-text-dark mb-4">Employee Engagement</h3>
            <EngagementChart />
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-text-dark mb-4">Recent Activity</h3>
          <RecentActivityList />
        </div>
      </Card>
    </div>
  )
}

// Employee Progress Report Component
function EmployeeProgressReport({ employees }) {
  const [sortBy, setSortBy] = useState('progress')
  const [filterDepartment, setFilterDepartment] = useState('all')

  // Mock progress data - in real app, this would come from enrollments
  const employeeProgress = employees.map(employee => ({
    ...employee,
    coursesAssigned: Math.floor(Math.random() * 10) + 1,
    coursesCompleted: Math.floor(Math.random() * 8),
    averageScore: Math.floor(Math.random() * 30) + 70,
    lastActivity: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
  }))

  const sortedEmployees = [...employeeProgress].sort((a, b) => {
    switch (sortBy) {
      case 'progress':
        return (b.coursesCompleted / b.coursesAssigned) - (a.coursesCompleted / a.coursesAssigned)
      case 'score':
        return b.averageScore - a.averageScore
      case 'activity':
        return new Date(b.lastActivity) - new Date(a.lastActivity)
      default:
        return 0
    }
  })

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <select
          className="px-3 py-2 border border-background-dark rounded-lg"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="progress">Sort by Progress</option>
          <option value="score">Sort by Score</option>
          <option value="activity">Sort by Last Activity</option>
        </select>
        
        <select
          className="px-3 py-2 border border-background-dark rounded-lg"
          value={filterDepartment}
          onChange={(e) => setFilterDepartment(e.target.value)}
        >
          <option value="all">All Departments</option>
          <option value="engineering">Engineering</option>
          <option value="sales">Sales</option>
          <option value="marketing">Marketing</option>
        </select>
      </div>

      {/* Employee Progress Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-background-dark">
                <th className="text-left py-3 px-4 font-medium text-text-dark">Employee</th>
                <th className="text-left py-3 px-4 font-medium text-text-dark">Progress</th>
                <th className="text-left py-3 px-4 font-medium text-text-dark">Courses</th>
                <th className="text-left py-3 px-4 font-medium text-text-dark">Avg Score</th>
                <th className="text-left py-3 px-4 font-medium text-text-dark">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {sortedEmployees.map((employee) => (
                <tr key={employee.id} className="border-b border-background-light hover:bg-background-light">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary-light rounded-full flex items-center justify-center">
                        <span className="text-primary-default font-medium">
                          {employee.users?.user_metadata?.full_name?.[0] || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-text-dark">
                          {employee.users?.user_metadata?.full_name || 'Unknown'}
                        </p>
                        <p className="text-sm text-text-light">{employee.users?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-background-medium rounded-full h-2">
                        <div 
                          className="bg-success-default h-2 rounded-full" 
                          style={{ width: `${(employee.coursesCompleted / employee.coursesAssigned) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-text-medium">
                        {Math.round((employee.coursesCompleted / employee.coursesAssigned) * 100)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-text-dark">
                    {employee.coursesCompleted}/{employee.coursesAssigned}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`font-medium ${
                      employee.averageScore >= 85 ? 'text-success-default' :
                      employee.averageScore >= 70 ? 'text-warning-default' :
                      'text-error-default'
                    }`}>
                      {employee.averageScore}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-text-light">
                    {employee.lastActivity.toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// Course Analytics Report Component
function CourseAnalyticsReport({ assignments }) {
  // Mock data for course performance
  const courseStats = assignments.map(assignment => ({
    ...assignment,
    enrollments: Math.floor(Math.random() * 50) + 10,
    completions: Math.floor(Math.random() * 40) + 5,
    averageScore: Math.floor(Math.random() * 30) + 70,
    averageTime: Math.floor(Math.random() * 120) + 30, // minutes
    completionRate: function() { 
      return Math.round((this.completions / this.enrollments) * 100)
    }
  }))

  const avgCompletion =
    courseStats.length > 0
      ? Math.round(
          courseStats.reduce((acc, course) => acc + course.completionRate(), 0) /
            courseStats.length
        )
      : 0
  const avgTime =
    courseStats.length > 0
      ? Math.round(
          courseStats.reduce((acc, course) => acc + course.averageTime, 0) /
            courseStats.length
        )
      : 0

  return (
    <div className="space-y-6">
      {/* Course Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricTile
          title="Total Courses"
          value={assignments.length}
          variant="blue"
          icon={BookOpen}
          footer={<span className="text-success-default">+2 this month</span>}
        />
        <MetricTile
          title="Avg Completion Rate"
          value={`${avgCompletion}%`}
          variant="green"
          icon={Target}
          footer={<span className="text-success-default">+5% vs last month</span>}
        />
        <MetricTile
          title="Avg Time to Complete"
          value={`${avgTime}m`}
          variant="orange"
          icon={Clock}
          footer={<span className="text-warning-default">-10m vs last month</span>}
        />
      </div>

      {/* Course Performance Table */}
      <Card>
        <div className="p-6 border-b border-background-dark">
          <h3 className="text-lg font-semibold text-text-dark">Course Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-background-dark">
                <th className="text-left py-3 px-6 font-medium text-text-dark">Course</th>
                <th className="text-left py-3 px-6 font-medium text-text-dark">Enrollments</th>
                <th className="text-left py-3 px-6 font-medium text-text-dark">Completions</th>
                <th className="text-left py-3 px-6 font-medium text-text-dark">Rate</th>
                <th className="text-left py-3 px-6 font-medium text-text-dark">Avg Score</th>
                <th className="text-left py-3 px-6 font-medium text-text-dark">Avg Time</th>
              </tr>
            </thead>
            <tbody>
              {courseStats.map((course) => (
                <tr key={course.id} className="border-b border-background-light hover:bg-background-light">
                  <td className="py-4 px-6">
                    <div>
                      <p className="font-medium text-text-dark">{course.courses?.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {course.is_mandatory && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-error-light text-error-default">
                            Mandatory
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-text-dark">{course.enrollments}</td>
                  <td className="py-4 px-6 text-text-dark">{course.completions}</td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-background-medium rounded-full h-2 w-16">
                        <div 
                          className="bg-success-default h-2 rounded-full" 
                          style={{ width: `${course.completionRate()}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-text-medium">{course.completionRate()}%</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`font-medium ${
                      course.averageScore >= 85 ? 'text-success-default' :
                      course.averageScore >= 70 ? 'text-warning-default' :
                      'text-error-default'
                    }`}>
                      {course.averageScore}%
                    </span>
                  </td>
                  <td className="py-4 px-6 text-text-dark">{course.averageTime}m</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// Metric Card Component
function MetricCard({ title, icon: Icon, subtitle, color, trend, value }) {
  const variantByColor = {
    primary: 'blue',
    success: 'green',
    warning: 'orange',
    error: 'error',
  }
  const variant = variantByColor[color] ?? 'blue'
  const hasFooter = Boolean(subtitle || trend)

  const footer = hasFooter ? (
    <div className="space-y-1">
      {subtitle ? (
        <p className="text-sm text-text-light">{subtitle}</p>
      ) : null}
      {trend ? (
        <div
          className={`flex items-center gap-1 text-xs ${
            trend.direction === 'up' ? 'text-success-default' : 'text-error-default'
          }`}
        >
          <TrendingUp
            className={`w-3 h-3 shrink-0 ${
              trend.direction === 'down' ? 'rotate-180' : ''
            }`}
          />
          <span>{trend.value}% vs last period</span>
        </div>
      ) : null}
    </div>
  ) : null

  return (
    <MetricTile
      title={title}
      value={value}
      variant={variant}
      icon={Icon}
      footer={footer}
    />
  )
}

// Placeholder Chart Components
function LearningProgressChart() {
  return (
    <div className="h-64 bg-background-light rounded-lg flex items-center justify-center">
      <div className="text-center">
        <BarChart3 className="w-12 h-12 text-text-muted mx-auto mb-3" />
        <p className="text-text-light">Learning progress chart</p>
        <p className="text-sm text-text-muted">Chart implementation needed</p>
      </div>
    </div>
  )
}

function EngagementChart() {
  return (
    <div className="h-64 bg-background-light rounded-lg flex items-center justify-center">
      <div className="text-center">
        <TrendingUp className="w-12 h-12 text-text-muted mx-auto mb-3" />
        <p className="text-text-light">Engagement metrics</p>
        <p className="text-sm text-text-muted">Chart implementation needed</p>
      </div>
    </div>
  )
}

function RecentActivityList() {
  const activities = [
    { user: 'John Doe', action: 'completed', target: 'JavaScript Fundamentals', time: '2 hours ago' },
    { user: 'Jane Smith', action: 'started', target: 'React Development', time: '4 hours ago' },
    { user: 'Mike Johnson', action: 'achieved 95% on', target: 'Node.js Basics', time: '1 day ago' },
    { user: 'Sarah Wilson', action: 'completed', target: 'Database Design', time: '1 day ago' },
    { user: 'Tom Brown', action: 'enrolled in', target: 'Python Programming', time: '2 days ago' }
  ]

  return (
    <div className="space-y-3">
      {activities.map((activity, index) => (
        <div key={`activity-${activity.id || index}`} className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-primary-default rounded-full"></div>
            <p className="text-sm text-text-dark">
              <span className="font-medium">{activity.user}</span> {activity.action} <span className="font-medium">{activity.target}</span>
            </p>
          </div>
          <p className="text-xs text-text-light">{activity.time}</p>
        </div>
      ))}
    </div>
  )
}

// Placeholder components for other report types
function CompletionsReport() {
  return (
    <div className="text-center py-12">
      <Award className="w-16 h-16 text-text-muted mx-auto mb-4" />
      <h3 className="text-lg font-medium text-text-dark mb-2">Completions Report</h3>
      <p className="text-text-light">Detailed completion analytics coming soon</p>
    </div>
  )
}

function EngagementReport() {
  return (
    <div className="text-center py-12">
      <TrendingUp className="w-16 h-16 text-text-muted mx-auto mb-4" />
      <h3 className="text-lg font-medium text-text-dark mb-2">Engagement Report</h3>
      <p className="text-text-light">Engagement metrics and analytics coming soon</p>
    </div>
  )
}
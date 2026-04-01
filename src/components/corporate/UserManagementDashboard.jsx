// src/components/corporate/UserManagementDashboard.jsx
import { useState, useEffect, useRef } from 'react'
import { 
  Users, 
  UserPlus, 
  Building2, 
  Shield, 
  BarChart3,
  Settings,
  Activity,
  Download,
  Upload,
  RefreshCw,
  Filter,
  Search
} from 'lucide-react'
import { useCorporateStore, useCurrentCompany, useEmployees, useDepartments, useInvitations } from '@/store/corporateStore'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import MetricTile from '@/components/ui/MetricTile'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

// Import the management components
import EmployeeManagement from './EmployeeManagement'
import DepartmentManagement from './DepartmentManagement'
import UserInvitation from './UserInvitation'
import RoleManagement from './RoleManagement'

export default function UserManagementDashboard() {
  const currentCompany = useCurrentCompany()
  const employees = useEmployees()
  const departments = useDepartments()
  const invitations = useInvitations()
  const { 
    fetchEmployees,
    fetchDepartments,
    fetchInvitations,
    fetchCompanyStats,
    fetchCurrentCompany,
    loading
  } = useCorporateStore()

  const [activeTab, setActiveTab] = useState('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState('30days')
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false)
  const exportHandlerRef = useRef(null)

  useEffect(() => {
    const initializeData = async () => {
      // If no company, try to fetch it first
      if (!currentCompany && !loading) {
        await fetchCurrentCompany()
      }
      // Load dashboard data (will work even if no company - will show empty state)
      await loadDashboardData()
    }
    
    initializeData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Show timeout message if loading takes too long
  useEffect(() => {
    if (loading && !currentCompany && employees.length === 0 && departments.length === 0) {
      const timeout = setTimeout(() => {
        setShowTimeoutMessage(true)
      }, 3000) // Show message after 3 seconds
      
      return () => clearTimeout(timeout)
    } else {
      setShowTimeoutMessage(false)
    }
  }, [loading, currentCompany, employees.length, departments.length])

  const loadDashboardData = async () => {
    await Promise.all([
      fetchEmployees(),
      fetchDepartments(),
      fetchInvitations(),
      fetchCompanyStats()
    ])
  }

  // Export function that can be called from header
  const handleHeaderExport = () => {
    if (exportHandlerRef.current) {
      exportHandlerRef.current()
    } else {
      // If overview tab is not active, switch to it first
      if (activeTab !== 'overview') {
        setActiveTab('overview')
        // Wait for tab to render, then trigger export
        setTimeout(() => {
          if (exportHandlerRef.current) {
            exportHandlerRef.current()
          }
        }, 200)
      }
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'departments', label: 'Departments', icon: Building2 },
    { id: 'invitations', label: 'Invitations', icon: UserPlus },
    { id: 'roles', label: 'Roles & Permissions', icon: Shield }
  ]

  const getStats = () => {
    const totalEmployees = employees?.length || 0
    const activeEmployees = employees?.filter(emp => emp.status === 'active').length || 0
    const pendingInvitations = invitations?.filter(inv => {
      if (!inv.expires_at) return false
      return inv.status === 'pending' && new Date(inv.expires_at) > new Date()
    }).length || 0
    const totalDepartments = departments?.length || 0
    const departmentsWithManagers = departments?.filter(dept => dept.manager_id).length || 0

    return {
      totalEmployees,
      activeEmployees,
      pendingInvitations,
      totalDepartments,
      departmentsWithManagers,
      inactiveEmployees: totalEmployees - activeEmployees
    }
  }

  const stats = getStats()

  // Show loading only if we're actively fetching and haven't determined company status yet
  if (loading && !currentCompany && employees.length === 0 && departments.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center py-12">
        <LoadingSpinner size="lg" />
        <p className="text-text-medium mt-4">Loading company data...</p>
        {showTimeoutMessage && (
          <p className="text-sm text-text-light mt-2">
            This may take a moment. If you don't have an organization, you may need to create one.
          </p>
        )}
      </div>
    )
  }
  
  // If no company but not loading, show message
  if (!currentCompany && !loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col justify-center items-center py-12">
          <Building2 className="h-16 w-16 text-text-light mb-4" />
          <h2 className="text-xl font-semibold text-text-dark mb-2">No Organization Found</h2>
          <p className="text-text-medium text-center max-w-md">
            You need to be part of an organization to manage users. Please contact your administrator or create an organization.
          </p>
        </div>
      </div>
    )
  }
  
  if (loading && employees.length === 0 && departments.length === 0 && currentCompany) {
    return (
      <div className="flex flex-col justify-center items-center py-12">
        <LoadingSpinner size="lg" />
        <p className="text-text-medium mt-4">Loading user management data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">User Management</h1>
          <p className="text-text-light">
            Manage your organization's users, departments, and permissions
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={loadDashboardData}
            disabled={loading}
            title="Refresh all data"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="outline"
            onClick={handleHeaderExport}
            title="Export user data to CSV"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-background-dark">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                data-tab={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === tab.id
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

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <OverviewTab 
            stats={stats} 
            onTabChange={setActiveTab}
            exportHandlerRef={exportHandlerRef}
          />
        )}
        {activeTab === 'employees' && <EmployeeManagement />}
        {activeTab === 'departments' && <DepartmentManagement />}
        {activeTab === 'invitations' && <UserInvitation />}
        {activeTab === 'roles' && <RoleManagement />}
      </div>
    </div>
  )
}

// Overview Tab Component
function OverviewTab({ stats, onTabChange, exportHandlerRef }) {
  const employees = useEmployees()
  const departments = useDepartments()
  const invitations = useInvitations()
  const { 
    loading, 
    inviteEmployee,
    fetchEmployees,
    fetchDepartments,
    fetchInvitations,
    fetchCompanyStats
  } = useCorporateStore()
  const [recentActivity, setRecentActivity] = useState([])
  const [departmentStats, setDepartmentStats] = useState([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const loadRealData = async () => {
      try {
        setLoadingStats(true)
        
        // Calculate department stats from real data
        const deptStats = await Promise.all(
          departments.map(async (dept) => {
            const deptEmployees = employees.filter(emp => emp.department_id === dept.id)
            const managers = deptEmployees.filter(emp => emp.role === 'manager' || emp.role === 'admin').length
            
            // Calculate completion rate from course enrollments
            let completion = 0
            if (deptEmployees.length > 0) {
              try {
                const employeeIds = deptEmployees.map(emp => emp.user_id).filter(Boolean)
                
                if (employeeIds.length > 0) {
                  const { data: enrollments } = await supabase
                    .from('course_enrollments')
                    .select('progress_percentage')
                    .in('user_id', employeeIds)
                  
                  if (enrollments && enrollments.length > 0) {
                    const totalProgress = enrollments.reduce((sum, e) => sum + (e.progress_percentage || 0), 0)
                    completion = Math.round(totalProgress / enrollments.length)
                  }
                }
              } catch (error) {
                // If we can't fetch completion data, set to 0
                completion = 0
              }
            }
            
            return {
              id: dept.id,
              name: dept.name,
              employees: deptEmployees.length,
              managers,
              completion: completion || 0
            }
          })
        )
        
        setDepartmentStats(deptStats)
        
        // Build recent activity from real data
        const activities = []
        
        // Recent employees (joined in last 7 days)
        const recentEmployees = employees
          .filter(emp => {
            if (!emp.joined_at) return false
            const joinedDate = new Date(emp.joined_at)
            const daysAgo = (Date.now() - joinedDate.getTime()) / (1000 * 60 * 60 * 24)
            return daysAgo <= 7
          })
          .sort((a, b) => new Date(b.joined_at) - new Date(a.joined_at))
          .slice(0, 3)
        
        recentEmployees.forEach(emp => {
          const deptName = departments.find(d => d.id === emp.department_id)?.name || 'the organization'
          const joinedDate = new Date(emp.joined_at)
          const timeAgo = getTimeAgo(joinedDate)
          activities.push({
            id: `emp-${emp.id}`,
            type: 'user_joined',
            message: `${emp.full_name || emp.email || 'A user'} joined ${deptName}`,
            time: timeAgo
          })
        })
        
        // Recent invitations
        const recentInvitations = invitations
          .filter(inv => !inv.used_at && new Date(inv.expires_at) > new Date())
          .sort((a, b) => new Date(b.invited_at) - new Date(a.invited_at))
          .slice(0, 3)
        
        recentInvitations.forEach(inv => {
          const invitedDate = new Date(inv.invited_at)
          const timeAgo = getTimeAgo(invitedDate)
          activities.push({
            id: `inv-${inv.id}`,
            type: 'invitation_sent',
            message: `Invitation sent to ${inv.email}`,
            time: timeAgo
          })
        })
        
        // Sort activities by time (most recent first)
        activities.sort((a, b) => {
          const timeA = getTimeValue(a.time)
          const timeB = getTimeValue(b.time)
          return timeB - timeA
        })
        
        setRecentActivity(activities.slice(0, 5))
      } catch (error) {
        console.error('Error loading overview data:', error)
      } finally {
        setLoadingStats(false)
      }
    }
    
    loadRealData()
  }, [employees, departments, invitations])
  
  // Helper function to get time ago string
  const getTimeAgo = (date) => {
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`
    return date.toLocaleDateString()
  }
  
  // Helper to sort activities by time
  const getTimeValue = (timeStr) => {
    if (timeStr.includes('Just now')) return 0
    if (timeStr.includes('minute')) return parseInt(timeStr) * 60
    if (timeStr.includes('hour')) return parseInt(timeStr) * 3600
    if (timeStr.includes('day')) return parseInt(timeStr) * 86400
    return 999999999
  }

  // Refresh all data
  const handleRefresh = async () => {
    try {
      setLoadingStats(true)
      await Promise.all([
        fetchEmployees(),
        fetchDepartments(),
        fetchInvitations(),
        fetchCompanyStats()
      ])
      toast.success('Data refreshed successfully')
    } catch (error) {
      console.error('Error refreshing data:', error)
      toast.error('Failed to refresh data')
    } finally {
      setLoadingStats(false)
    }
  }

  // Export user data to CSV
  const handleExportUserData = async () => {
    if (exporting) return
    
    try {
      setExporting(true)
      
      // Check if there's any data to export
      if (employees.length === 0 && departments.length === 0 && invitations.length === 0) {
        toast.error('No data to export')
        return
      }
      // Prepare employees data
      const employeesData = employees.map(emp => ({
        'Employee ID': emp.id || '',
        'User ID': emp.user_id || '',
        'Full Name': emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || '',
        'Email': emp.email || '',
        'Role': emp.role || '',
        'Status': emp.status || '',
        'Department': departments.find(d => d.id === emp.department_id)?.name || 'No Department',
        'Joined At': emp.joined_at ? new Date(emp.joined_at).toLocaleDateString() : '',
        'Invited By': emp.invited_by || ''
      }))

      // Prepare departments data
      const departmentsData = departments.map(dept => ({
        'Department ID': dept.id || '',
        'Name': dept.name || '',
        'Manager ID': dept.manager_id || '',
        'Created At': dept.created_at ? new Date(dept.created_at).toLocaleDateString() : ''
      }))

      // Prepare invitations data
      const invitationsData = invitations.map(inv => ({
        'Invitation ID': inv.id || '',
        'Email': inv.email || '',
        'Role': inv.role || '',
        'Status': inv.status || '',
        'Invited At': inv.invited_at ? new Date(inv.invited_at).toLocaleDateString() : '',
        'Expires At': inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : '',
        'Used At': inv.used_at ? new Date(inv.used_at).toLocaleDateString() : 'Not Used',
        'Department': departments.find(d => d.id === inv.department_id)?.name || ''
      }))

      // Combine all data
      const allData = {
        employees: employeesData,
        departments: departmentsData,
        invitations: invitationsData
      }

      // Create CSV content
      const csvContent = [
        '=== EMPLOYEES ===',
        convertToCSV(employeesData),
        '',
        '=== DEPARTMENTS ===',
        convertToCSV(departmentsData),
        '',
        '=== INVITATIONS ===',
        convertToCSV(invitationsData)
      ].join('\n')

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      const filename = `user_management_export_${new Date().toISOString().split('T')[0]}.csv`
      
      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('User data exported successfully')
    } catch (error) {
      console.error('Error exporting user data:', error)
      toast.error('Failed to export user data')
    } finally {
      setExporting(false)
    }
  }

  // Convert data array to CSV format
  const convertToCSV = (data) => {
    if (!Array.isArray(data) || data.length === 0) return ''

    const headers = Object.keys(data[0])
    const csvRows = [
      headers.map(h => `"${h}"`).join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header]
          if (value === null || value === undefined) return '""'
          // Escape quotes and wrap in quotes
          const stringValue = String(value).replace(/"/g, '""')
          return `"${stringValue}"`
        }).join(',')
      )
    ]

    return csvRows.join('\n')
  }

  // Expose export function to parent via ref
  useEffect(() => {
    if (exportHandlerRef) {
      exportHandlerRef.current = handleExportUserData
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees.length, departments.length, invitations.length])

  const hasNoData = stats.totalEmployees === 0 && stats.totalDepartments === 0 && stats.pendingInvitations === 0

  return (
    <div className="space-y-6">
      {hasNoData && !loadingStats && (
        <Card className="p-8">
          <div className="text-center">
            <Users className="h-16 w-16 text-text-light mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-dark mb-2">Get Started with User Management</h3>
            <p className="text-text-medium mb-6">
              Start by inviting employees or creating departments to organize your team.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => onTabChange('invitations')}>
                <UserPlus className="w-4 h-4 mr-2" />
                Invite First Employee
              </Button>
              <Button variant="outline" onClick={() => onTabChange('departments')}>
                <Building2 className="w-4 h-4 mr-2" />
                Create Department
              </Button>
            </div>
          </div>
        </Card>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricTile
          title="Total Employees"
          value={stats.totalEmployees}
          variant="blue"
          icon={Users}
          footer={
            stats.totalEmployees > 0 ? (
              <span className="text-success-default">{stats.activeEmployees} active</span>
            ) : (
              <span>No employees yet</span>
            )
          }
        />
        <MetricTile
          title="Departments"
          value={stats.totalDepartments}
          variant="purple"
          icon={Building2}
          footer={<span>{stats.departmentsWithManagers} with managers</span>}
        />
        <MetricTile
          title="Pending Invitations"
          value={stats.pendingInvitations}
          variant="orange"
          icon={UserPlus}
          footer={<span className="text-warning-default">Awaiting response</span>}
        />
        <MetricTile
          title="Inactive Users"
          value={stats.inactiveEmployees}
          variant="error"
          icon={Activity}
          footer={<span className="text-error-default">Need attention</span>}
        />
      </div>

      {/* Department Performance */}
      <Card>
        <div className="p-6 border-b border-background-dark">
          <h3 className="text-lg font-semibold text-text-dark">Department Performance</h3>
          <p className="text-text-light">Course completion rates by department</p>
        </div>
        <div className="p-6">
          {loadingStats ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : departmentStats.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-text-light mx-auto mb-3" />
              <p className="text-text-medium mb-1">No departments yet</p>
              <p className="text-sm text-text-light">Create departments to track performance</p>
            </div>
          ) : (
            <div className="space-y-4">
              {departmentStats.map((dept) => (
                <div key={`dept-${dept.id}`} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-text-dark">{dept.name}</span>
                    <span className="text-sm text-text-light">{dept.completion}%</span>
                  </div>
                  <div className="w-full bg-background-light rounded-full h-2">
                    <div 
                      className="bg-primary-default h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(dept.completion, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm text-text-light">
                    <span>{dept.employees} {dept.employees === 1 ? 'employee' : 'employees'}</span>
                    <span>{dept.managers} {dept.managers === 1 ? 'manager' : 'managers'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-6 border-b border-background-dark">
            <h3 className="text-lg font-semibold text-text-dark">Recent Activity</h3>
            <p className="text-text-light">Latest user management activities</p>
          </div>
          <div className="p-6">
            {loadingStats ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-text-light mx-auto mb-3" />
                <p className="text-text-medium mb-1">No recent activity</p>
                <p className="text-sm text-text-light">Activity will appear here as users join and invitations are sent</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary-default rounded-full mt-2 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-text-dark">{activity.message}</p>
                      <p className="text-xs text-text-light">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-6 border-b border-background-dark">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-text-dark">Quick Actions</h3>
                <p className="text-text-light">Common user management tasks</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={loadingStats}
                title="Refresh data"
              >
                <RefreshCw className={`w-4 h-4 ${loadingStats ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => {
                  onTabChange('invitations')
                  // Small delay to ensure tab change happens before any scroll
                  setTimeout(() => {
                    const invitationsTab = document.querySelector('[data-tab="invitations"]')
                    if (invitationsTab) {
                      invitationsTab.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                  }, 100)
                }}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Invite New User
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => {
                  onTabChange('departments')
                  setTimeout(() => {
                    const departmentsTab = document.querySelector('[data-tab="departments"]')
                    if (departmentsTab) {
                      departmentsTab.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                  }, 100)
                }}
              >
                <Building2 className="w-4 h-4 mr-2" />
                Create Department
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => {
                  onTabChange('roles')
                  setTimeout(() => {
                    const rolesTab = document.querySelector('[data-tab="roles"]')
                    if (rolesTab) {
                      rolesTab.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                  }, 100)
                }}
              >
                <Shield className="w-4 h-4 mr-2" />
                Manage Roles
              </Button>
              <Button 
                data-action="export"
                className="w-full justify-start" 
                variant="outline"
                onClick={handleExportUserData}
                disabled={exporting || employees.length === 0}
                title={employees.length === 0 ? 'No data to export' : 'Export all user data to CSV'}
              >
                <Download className={`w-4 h-4 mr-2 ${exporting ? 'animate-pulse' : ''}`} />
                {exporting ? 'Exporting...' : 'Export User Data'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

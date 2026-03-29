

// src/pages/corporate/CompanyDashboard.jsx - Updated to use real data
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuth';
import { useCorporate } from '@/hooks/corporate/useCorporate';
import { useCorporateStore } from '@/store/corporateStore';
import { BookOpen, Plus, Settings, AlertCircle, Users, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import PageTitle from '@/components/layout/PageTitle';

const CompanyDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { 
    organization, 
    role, 
    loading: corporateLoading, 
    error: corporateError, 
    hasPermission,
    isCorporateUser,
    initialized 
  } = useCorporate();
  
  const { fetchCompanyStats, fetchEmployees, companyStats, employees } = useCorporateStore();
  
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    totalEmployees: 0,
    activeEnrollments: 0,
    coursesCompleted: 0,
    utilizationRate: 0
  });
  const [dataLoading, setDataLoading] = useState(false);
  const [recentActivity, setRecentActivity] = useState([]);

  // Determine overall loading state
  const isLoading = authLoading || corporateLoading || !initialized;

  // Handle corporate loading timeout
  useEffect(() => {
    if (corporateError && typeof corporateError === 'string' && corporateError.includes('timeout')) {
      console.warn('Corporate data loading timed out, showing fallback dashboard');
      // Set a timeout to show fallback data if corporate loading fails
      const timeoutId = setTimeout(() => {
        if (!organization && !corporateLoading) {
          // Show fallback dashboard data
          setDashboardData({
            totalEmployees: 0,
            activeEnrollments: 0,
            coursesCompleted: 0,
            utilizationRate: 0
          });
          setRecentActivity([]);
        }
      }, 5000); // 5 second timeout

      return () => clearTimeout(timeoutId);
    }
  }, [corporateError, organization, corporateLoading]);

  // Load dashboard data after organization is available
  useEffect(() => {
    if (organization && !corporateLoading) {
      fetchDashboardData();
    } else if (!corporateLoading && !organization) {
      // User has no organization, reset dashboard data
      setDashboardData({
        totalEmployees: 0,
        activeEnrollments: 0,
        coursesCompleted: 0,
        utilizationRate: 0
      });
      setRecentActivity([]);
    }
  }, [organization, corporateLoading]);

  const fetchDashboardData = async () => {
    if (!organization?.id) return;

    setDataLoading(true);
    try {
      // Fetch company stats and employees concurrently
      const [companyStatsResult, employeesResult] = await Promise.all([
        fetchCompanyStats(),
        fetchEmployees()
      ]);

      // Set dashboard data with available information
      setDashboardData({
        totalEmployees: employeesResult?.length || 0,
        activeEnrollments: employeesResult?.length || 0,
        coursesCompleted: companyStatsResult?.coursesCompleted || 0,
        utilizationRate: companyStatsResult?.utilizationRate || 0
      });

      // Fetch recent activity
      await fetchRecentActivity();
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    if (!organization?.id) return;

    try {
      // Fetch recent course enrollments and completions
      // Include user profile information to show names instead of IDs
      const { data: enrollments, error } = await supabase
        .from('course_enrollments')
        .select(`
          *,
          course:courses(title),
          user:profiles(id, first_name, last_name, email)
        `)
        .order('enrolled_at', { ascending: false })
        .limit(5);

      if (error) {
        console.warn('Error fetching recent activity:', error);
        setRecentActivity([]);
        return;
      }

      // Transform the data into activity items
      const activityItems = enrollments?.map(enrollment => {
        // Get user name from profile, fallback to email, then to "Unknown User"
        const user = enrollment.user;
        let userName = 'Unknown User';
        if (user) {
          const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
          userName = fullName || user.email || 'Unknown User';
        }
        
        return {
          id: enrollment.id,
          type: enrollment.status === 'completed' ? 'completion' : 'enrollment',
          title: enrollment.course?.title || 'Unknown Course',
          timestamp: enrollment.enrolled_at,
          user: userName,
          status: enrollment.status
        };
      }) || [];

      setRecentActivity(activityItems);
    } catch (error) {
      console.warn('Error in fetchRecentActivity:', error);
      setRecentActivity([]);
    }
  };

  // Handle creating a new organization
  const handleCreateOrganization = () => {
    navigate('/company/setup');
  };

  // Handle joining an organization
  const handleJoinOrganization = () => {
    navigate('/company/join');
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading company dashboard...</p>
          {corporateError && (
            <p className="text-sm text-red-500 mt-2">
              {typeof corporateError === 'string' ? corporateError : 'Error loading data'}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Show error state for corporate data
  if (corporateError && !organization) {
    const errorMessage = typeof corporateError === 'string' 
      ? corporateError 
      : 'Failed to load organization data';
    
    const isTimeoutError = typeof corporateError === 'string' && corporateError.includes('timeout');
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
            <p className="text-gray-600 mb-4">
              {isTimeoutError 
                ? 'Loading organization data timed out. Please try refreshing the page.'
                : errorMessage
              }
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Refresh Page
              </button>
              <button
                onClick={() => navigate('/app/dashboard')}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Go to Main Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Auth error state
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to access your dashboard.</p>
          <Link 
            to="/login" 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // No organization state
  if (!isCorporateUser || !organization) {
    return (
      <div className="p-6 max-w-8xl mx-auto">
        <div className="text-center py-12">
          <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-6" />
          <PageTitle
            as="h1"
            align="center"
            title="No Organization Found"
            titleClassName="!text-gray-900"
            subtitle="You're not currently part of any organization. Create a new organization for your company or join an existing one."
            subtitleWrapperClassName="text-gray-600 mb-8 max-w-md mx-auto"
          />
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleCreateOrganization}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Organization
            </button>
            <button
              onClick={handleJoinOrganization}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 flex items-center justify-center"
            >
              <Users className="h-5 w-5 mr-2" />
              Join Organization
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <PageTitle
              title={organization.name}
              subtitle={
                <>
                  <p>
                    Welcome back, {user?.email}! You are {role === 'admin' ? 'an' : 'a'}{' '}
                    {role} of this organization.
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Dashboard shows real-time data from your organization&apos;s learning activities.
                  </p>
                </>
              }
              subtitleWrapperClassName="pt-1 text-sm text-gray-600 sm:text-base space-y-0"
            />
            <div className="flex shrink-0 items-center space-x-4">
              <button
                onClick={fetchDashboardData}
                disabled={dataLoading}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{dataLoading ? 'Refreshing...' : 'Refresh'}</span>
              </button>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                organization.subscription_status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : organization.subscription_status === 'trial'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {organization.subscription_status?.charAt(0).toUpperCase() + organization.subscription_status?.slice(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Company Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-md">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Employees</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {dataLoading ? "..." : dashboardData.totalEmployees}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-md">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Enrollments</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {dataLoading ? "..." : dashboardData.activeEnrollments}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-md">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Courses Completed</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {dataLoading ? "..." : dashboardData.coursesCompleted}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
          </div>
          <div className="p-6">
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center p-3 bg-gray-50 rounded-md">
                    <div className={`w-2 h-2 rounded-full mr-3 ${
                      activity.type === 'completion' ? 'bg-green-400' : 'bg-blue-400'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {activity.user} {activity.type === 'completion' ? 'completed' : 'enrolled in'} {activity.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : employees && employees.length > 0 ? (
              <>
                <div className="flex items-center p-3 bg-gray-50 rounded-md">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Total employees: {employees.length}</p>
                    <p className="text-xs text-gray-500">Active organization members</p>
                  </div>
                </div>
                {companyStats && (
                  <>
                    <div className="flex items-center p-3 bg-gray-50 rounded-md">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Course completion: {companyStats.coursesCompleted || 0} courses</p>
                        <p className="text-xs text-gray-500">Total completed across organization</p>
                      </div>
                    </div>
                    <div className="flex items-center p-3 bg-gray-50 rounded-md">
                      <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Utilization rate: {companyStats.utilizationRate || 0}%</p>
                        <p className="text-xs text-gray-500">Employees engaged in learning</p>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">No recent activity</p>
                <p className="text-xs text-gray-400">Start by inviting employees or assigning courses</p>
                <div className="mt-2 text-xs text-gray-400">
                  <p>• Employee data will appear here once loaded</p>
                  <p>• Course enrollments will show recent activity</p>
                  <p>• Use the refresh button to update data</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link 
            to="/app/courses/catalog" 
            className="w-full block p-3 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors"
          >
            <div className="flex items-center">
              <BookOpen className="h-6 w-6 text-purple-600 mr-3" />
              <div>
                <h4 className="font-medium text-purple-900">Browse Courses</h4>
                <p className="text-sm text-purple-700">Explore available learning content</p>
              </div>
            </div>
          </Link>

          <Link 
            to="/company/employees" 
            className="w-full block p-3 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
          >
            <div className="flex items-center">
              <Users className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h4 className="font-medium text-blue-900">Manage Employees</h4>
                <p className="text-sm text-blue-700">View and manage team members</p>
              </div>
            </div>
          </Link>

          <Link 
            to="/company/settings" 
            className="w-full block p-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
          >
            <div className="flex items-center">
              <Settings className="h-6 w-6 text-gray-600 mr-3" />
              <div>
                <h4 className="font-medium text-gray-900">Organization Settings</h4>
                <p className="text-sm text-gray-700">Configure your organization</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CompanyDashboard;
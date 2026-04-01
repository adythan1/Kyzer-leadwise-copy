// src/pages/dashboard/Activity.jsx
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuth';
import { useRecentActivity } from '@/hooks/courses/useRecentActivity';
import { 
  Clock, 
  BookOpen, 
  Award, 
  Play, 
  CheckCircle,
  Filter,
  Calendar,
  ArrowLeft
} from 'lucide-react';
import Card from '@/components/ui/Card';
import MetricTile from '@/components/ui/MetricTile';
import PageTitle from '@/components/layout/PageTitle';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const Activity = () => {
  const { profile } = useAuth();
  const { activities, loading, error } = useRecentActivity();
  const [filter, setFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const activityTypes = [
    { value: 'all', label: 'All Activities' },
    { value: 'course_started', label: 'Course Started' },
    { value: 'course_completed', label: 'Course Completed' },
    { value: 'lesson_completed', label: 'Lesson Completed' },
    { value: 'certificate_earned', label: 'Certificates' },
  ];

  const dateRanges = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' },
  ];

  const getActivityIcon = (type) => {
    switch (type) {
      case 'course_started':
        return <Play className="w-5 h-5 text-primary" />;
      case 'course_completed':
        return <CheckCircle className="w-5 h-5 text-success-default" />;
      case 'lesson_completed':
        return <BookOpen className="w-5 h-5 text-warning-default" />;
      case 'certificate_earned':
        return <Award className="w-5 h-5 text-success-default" />;
      default:
        return <Clock className="w-5 h-5 text-text-muted" />;
    }
  };

  const getActivityBadge = (type) => {
    switch (type) {
      case 'course_started':
        return <span className="px-2 py-1 bg-primary-light text-primary text-xs font-medium rounded">Started</span>;
      case 'course_completed':
        return <span className="px-2 py-1 bg-success-light text-success-default text-xs font-medium rounded">Completed</span>;
      case 'lesson_completed':
        return <span className="px-2 py-1 bg-warning-light text-warning-default text-xs font-medium rounded">Lesson</span>;
      case 'certificate_earned':
        return <span className="px-2 py-1 bg-success-light text-success-default text-xs font-medium rounded">Certificate</span>;
      default:
        return null;
    }
  };

  const filterActivities = useMemo(() => {
    let filtered = [...activities];

    // Filter by activity type
    if (filter !== 'all') {
      filtered = filtered.filter(activity => activity.type === filter);
    }

    // Filter by date range
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      filtered = filtered.filter(activity => {
        const activityDate = new Date(activity.timestamp);
        return activityDate >= filterDate;
      });
    }

    return filtered;
  }, [activities, filter, dateFilter]);

  const groupActivitiesByDate = (activities) => {
    const groups = {};
    
    activities.forEach(activity => {
      const date = new Date(activity.timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let dateKey;
      if (date.toDateString() === today.toDateString()) {
        dateKey = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        dateKey = 'Yesterday';
      } else if (date >= new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7)) {
        dateKey = 'This Week';
      } else if (date >= new Date(today.getFullYear(), today.getMonth(), 1)) {
        dateKey = 'This Month';
      } else {
        dateKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      }
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(activity);
    });
    
    return groups;
  };

  const groupedActivities = groupActivitiesByDate(filterActivities);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold text-text-dark mb-2">Error loading activity</h2>
          <p className="text-text-light mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light">
      {/* Header */}
      <div className="bg-background-white border-b border-border">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <PageTitle
                leading={
                  <Link
                    to="/app/dashboard"
                    className="shrink-0 rounded-lg p-2 transition-colors hover:bg-background-light"
                  >
                    <ArrowLeft className="h-5 w-5 text-text-medium" />
                  </Link>
                }
                title="Activity History"
                subtitle="View all your learning activities and progress"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Activity Type Filter */}
            <div>
              <label className="block text-sm font-medium text-text-dark mb-2">
                <Filter className="w-4 h-4 inline mr-2" />
                Activity Type
              </label>
              <div className="flex flex-wrap gap-2">
                {activityTypes.map(type => (
                  <button
                    key={type.value}
                    onClick={() => setFilter(type.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filter === type.value
                        ? 'bg-primary text-background-white'
                        : 'bg-background-light text-text-medium hover:bg-background-medium'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-text-dark mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Date Range
              </label>
              <div className="flex flex-wrap gap-2">
                {dateRanges.map(range => (
                  <button
                    key={range.value}
                    onClick={() => setDateFilter(range.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      dateFilter === range.value
                        ? 'bg-primary text-background-white'
                        : 'bg-background-light text-text-medium hover:bg-background-medium'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Activities List */}
        {filterActivities.length === 0 ? (
          <Card className="p-12 text-center">
            <Clock className="w-16 h-16 text-text-muted mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-text-dark mb-2">No activities found</h3>
            <p className="text-text-light mb-6">
              {filter !== 'all' || dateFilter !== 'all'
                ? 'Try adjusting your filters to see more activities'
                : 'Start learning to see your activity here'}
            </p>
            {filter === 'all' && dateFilter === 'all' && (
              <Link to="/app/courses/catalog">
                <Button variant="primary">Browse Courses</Button>
              </Link>
            )}
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedActivities).map(([dateGroup, groupActivities]) => (
              <div key={dateGroup}>
                <h2 className="text-lg font-semibold text-text-dark mb-4 sticky top-0 bg-background-light py-2 z-10">
                  {dateGroup}
                </h2>
                <div className="space-y-3">
                  {groupActivities.map((activity) => (
                    <Card key={activity.id} className="p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 mt-1">
                          <div className="w-10 h-10 rounded-full bg-background-light flex items-center justify-center">
                            {getActivityIcon(activity.type)}
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex-1">
                              <p className="text-base text-text-dark font-medium mb-1">
                                {activity.description}
                              </p>
                              {activity.course && (
                                <Link 
                                  to={`/app/courses/${activity.course.id}`}
                                  className="text-primary hover:text-primary-dark text-sm font-medium"
                                >
                                  {activity.course.title}
                                </Link>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {getActivityBadge(activity.type)}
                              <span className="text-xs text-text-light">
                                {activity.timeAgo}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-text-light mt-2">
                            <Clock className="w-3 h-3" />
                            <span>
                              {new Date(activity.timestamp).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Activity Summary */}
        {filterActivities.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <MetricTile
              layout="stack"
              variant="blue"
              icon={Play}
              title="Courses Started"
              value={filterActivities.filter((a) => a.type === 'course_started').length}
              paddingClassName="p-4"
            />
            <MetricTile
              layout="stack"
              variant="green"
              icon={CheckCircle}
              title="Courses Completed"
              value={filterActivities.filter((a) => a.type === 'course_completed').length}
              paddingClassName="p-4"
            />
            <MetricTile
              layout="stack"
              variant="orange"
              icon={BookOpen}
              title="Lessons Completed"
              value={filterActivities.filter((a) => a.type === 'lesson_completed').length}
              paddingClassName="p-4"
            />
            <MetricTile
              layout="stack"
              variant="green"
              icon={Award}
              title="Certificates"
              value={filterActivities.filter((a) => a.type === 'certificate_earned').length}
              paddingClassName="p-4"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Activity;


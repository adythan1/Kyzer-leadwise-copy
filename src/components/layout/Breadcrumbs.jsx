import React, { useState, useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useAuth } from '@/hooks/auth/useAuth';
import { useCourseStore } from '@/store/courseStore';
import { getBreadcrumbs, getCourseBreadcrumbs } from '@/config/navigation';

const Breadcrumbs = () => {
  const location = useLocation();
  const params = useParams();
  const { user } = useAuth();
  const isCorporateUser = user?.user_metadata?.account_type === 'corporate';
  
  // Subscribe to courses to react to store updates
  const courses = useCourseStore(state => state.courses);
  const actions = useCourseStore(state => state.actions);
  
  // Get course store for enhanced breadcrumbs (use getState for actions)
  const courseStore = useCourseStore.getState();
  
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBreadcrumbs = async () => {
      setLoading(true);
      
      try {
        // Check if this is a course-related path that needs enhanced breadcrumbs
        const isCoursePath = location.pathname.includes('/courses/');
        
        if (isCoursePath) {
          // Use enhanced course breadcrumbs - get fresh store state
          const freshStore = useCourseStore.getState();
          const enhancedBreadcrumbs = await getCourseBreadcrumbs(location.pathname, params, freshStore);
          setBreadcrumbs(enhancedBreadcrumbs);
        } else {
          // Use regular breadcrumbs
          const regularBreadcrumbs = getBreadcrumbs(location.pathname, params);
          setBreadcrumbs(regularBreadcrumbs);
        }
      } catch (error) {
        // Fallback to regular breadcrumbs
        const fallbackBreadcrumbs = getBreadcrumbs(location.pathname, params);
        setBreadcrumbs(fallbackBreadcrumbs);
      } finally {
        setLoading(false);
      }
    };

    // Small delay to ensure course store is populated
    const timer = setTimeout(loadBreadcrumbs, 100);
    return () => clearTimeout(timer);
  }, [location.pathname, params, courses]);

  // Don't show breadcrumbs on dashboard or if only one item
  const isDashboard = location.pathname === '/app/dashboard' || location.pathname === '/corporate/dashboard';
  if (isDashboard || breadcrumbs.length <= 1) return null;

  // Show loading state for course breadcrumbs
  if (loading && location.pathname.includes('/courses/')) {
    return (
      <nav className="flex items-center space-x-1 text-sm text-text-muted mb-2" aria-label="Breadcrumb">
        <div className="flex items-center">
          <Home size={14} className="mr-1" />
          <span>Loading...</span>
        </div>
      </nav>
    );
  }

  return (
    <nav className="flex items-center space-x-1 text-sm text-text-muted mb-2" aria-label="Breadcrumb">
      {breadcrumbs.map((breadcrumb, index) => (
        <div key={`${breadcrumb.href || 'item'}-${index}`} className="flex items-center">
          {index > 0 && <ChevronRight size={14} className="mx-2" />}
          
          {breadcrumb.href && !breadcrumb.isLast ? (
            <Link
              to={breadcrumb.href}
              className="flex items-center hover:text-text-medium transition-colors"
            >
              {index === 0 && <Home size={14} className="mr-1" />}
              {breadcrumb.label}
            </Link>
          ) : (
            <span className={`flex items-center ${breadcrumb.isLast ? 'text-text-dark font-medium' : ''}`}>
              {index === 0 && <Home size={14} className="mr-1" />}
              {breadcrumb.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
};

export default Breadcrumbs;
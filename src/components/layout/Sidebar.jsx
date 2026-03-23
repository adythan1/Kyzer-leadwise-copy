
// src/components/layout/Sidebar.jsx - Improved version for better corporate support
import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  User,
  Settings,
  Building2,
  Users,
  BarChart3,
  ChevronDown,
  ChevronRight,
  X,
  Award,
  TrendingUp,
  Loader,
  PanelLeftClose,
  PanelLeftOpen,
  FileEdit
} from "lucide-react";
import { useAuth } from "@/hooks/auth/useAuth";
import { useCorporate } from "@/hooks/corporate/useCorporate";
import { useCorporatePermissions } from "@/hooks/corporate/useCorporatePermissions";
import { useCoursePermissions } from "@/hooks/courses/useCoursePermissions";
import OrganizationNav from "./OrganizationNav";
import leadwiseLogo from "../../assets/images/leadwise.svg";

export default function Sidebar({ mobile = false, onClose, collapsed = false, onToggleCollapse }) {
  const { user } = useAuth();
  const { 
    organization, 
    isCorporateUser, 
    hasPermission, 
    role,
    loading: corporateLoading,
    companyName, // NEW: Fallback company name from metadata
    error: corporateError
  } = useCorporate();
  const { isOwner } = useCorporatePermissions();
  const { canViewCourseManagement } = useCoursePermissions();
  
  const location = useLocation();
  const [corporateExpanded, setCorporateExpanded] = useState(
    location.pathname.startsWith('/company')
  );

  // Use the course permissions hook instead of local function

  // Define navigation items
  const personalNavigation = [
    { 
      path: "/app/dashboard", 
      label: "Dashboard", 
      icon: LayoutDashboard 
    },
    { 
      path: "/app/courses", 
      label: "My Courses", 
      icon: BookOpen,
      children: [
        { name: "Enrolled", href: "/app/courses" },
        { name: "Browse Catalog", href: "/app/courses/catalog" }
      ]
    },
    { 
      path: "/app/progress", 
      label: "Progress", 
      icon: TrendingUp 
    },
    { 
      path: "/app/certificates", 
      label: "Certificates", 
      icon: Award 
    },
    { 
      path: "/app/profile", 
      label: "Profile", 
      icon: User 
    },
    { 
      path: "/app/settings", 
      label: "Settings", 
      icon: Settings 
    }
  ];

  // Course Management navigation - separate section (only shown if user has permission)
  const courseManagementNavigation = canViewCourseManagement ? [
    { 
      path: "/app/courses/management", 
      label: "Manage Courses", 
      icon: FileEdit 
    },
    { 
      path: "/app/courses/certificate-templates", 
      label: "Certificate Templates", 
      icon: Award 
    }
  ] : [];

  // Corporate navigation - only show if user has permissions
  const corporateNavigation = [
    { 
      path: "/company/dashboard", 
      label: "Company Dashboard", 
      icon: Building2,
      permission: null // Always visible to corporate users
    },
    { 
      path: "/company/employees", 
      label: "Employees", 
      icon: Users,
      permission: "invite_employees"
    },
    { 
      path: "/company/reports", 
      label: "Reports", 
      icon: BarChart3,
      permission: "view_reports"
    },
    { 
      path: "/company/settings", 
      label: "Settings", 
      icon: Settings,
      permission: "manage_settings"
    }
  ];

  // Filter corporate navigation based on permissions (owner sees all)
  const availableCorporateNavigation = corporateNavigation.filter(item => {
    if (!item.permission) return true; // Always show items without permission requirements
    if (isOwner) return true; // Owner has access to all routes
    return hasPermission(item.permission);
  });

  // NEW: Determine display states
  const shouldShowCorporateSection = isCorporateUser;
  const shouldShowSetupPrompt = isCorporateUser && !organization && !corporateLoading;
  const shouldShowCorporateNav = isCorporateUser && (organization || corporateLoading);
  
  // NEW: Get display company name (organization name or fallback to metadata)
  const displayCompanyName = organization?.name || companyName || 'Your Company';

  const NavItem = ({ route, onClick, collapsed = false }) => {
    const Icon = route.icon;
    
    // For routes without children, use exact match only
    const isActive = location.pathname === route.path;
    
    if (collapsed) {
      return (
        <div className="relative group">
          <NavLink
            to={route.path}
            onClick={onClick}
            className={`flex items-center justify-center w-12 h-12 mx-auto rounded-lg transition-all duration-200 relative ${
              isActive
                ? "bg-primary text-white shadow-lg"
                : "text-text-light hover:bg-background-medium hover:text-text-dark"
            }`}
            title={`${route.label} - Navigate to ${route.label.toLowerCase()}`}
            data-tooltip={`${route.label} - Navigate to ${route.label.toLowerCase()}`}
          >
            <Icon className="w-5 h-5" />
            {isActive && (
              <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-primary rounded-full"></div>
            )}
          </NavLink>
          {/* Custom tooltip */}
          <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 bg-background-dark text-text-light text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[9999] shadow-lg border border-border">
            {route.label}
            <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-background-dark"></div>
          </div>
        </div>
      );
    }

    return (
      <NavLink
        to={route.path}
        onClick={onClick}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
          isActive
            ? "bg-primary text-white"
            : "text-text-medium hover:bg-background-light hover:text-text-dark"
        }`}
      >
        <Icon className="w-5 h-5" />
        <span className="text-sm font-medium">{route.label}</span>
        {isActive && (
          <div className="ml-auto w-2 h-2 bg-white rounded-full opacity-75"></div>
        )}
      </NavLink>
    );
  };

  const NavItemWithChildren = ({ route, onClick, collapsed = false }) => {
    const Icon = route.icon;
    const [isExpanded, setIsExpanded] = useState(false);
    
    // Check if any child route is active
    const isChildActive = route.children?.some(child => location.pathname === child.href);
    // Parent is active if current path matches or if a child is active
    const isActive = location.pathname === route.path || isChildActive;
    
    if (collapsed) {
      return (
        <div className="relative group">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center justify-center w-12 h-12 mx-auto rounded-lg transition-all duration-200 relative ${
              isActive
                ? "bg-primary text-white shadow-lg"
                : "text-text-light hover:bg-background-medium hover:text-text-dark"
            }`}
            title={`${route.label} - Click to ${isExpanded ? 'collapse' : 'expand'} submenu`}
            data-tooltip={`${route.label} - Click to ${isExpanded ? 'collapse' : 'expand'} submenu`}
          >
            <Icon className="w-5 h-5" />
            {isActive && (
              <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-primary rounded-full"></div>
            )}
            {isExpanded && route.children && (
              <div className="absolute -right-1 -top-1 w-3 h-3 bg-primary rounded-full border-2 border-background-white"></div>
            )}
          </button>
          
          {/* Custom tooltip for expandable items */}
          <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 bg-background-dark text-text-light text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[9999] shadow-lg border border-border">
            {route.label}
            <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-background-dark"></div>
          </div>
          
          {/* Collapsed submenu - shows to the right of the sidebar */}
          {isExpanded && route.children && (
            <div className="fixed bg-background-white border border-border rounded-lg shadow-xl py-2 min-w-48 z-[9999]" 
                 style={{ 
                   left: collapsed ? '88px' : '272px',
                   top: '40%',
                   transform: 'translateY(-50%)'
                 }}>
              <div className="px-3 py-2 border-b border-border">
                <h4 className="text-sm font-semibold text-text-dark">{route.label}</h4>
              </div>
              <div className="space-y-1">
                {route.children.map((child) => {
                  const isChildRouteActive = location.pathname === child.href;
                  return (
                    <NavLink
                      key={child.href}
                      to={child.href}
                      onClick={onClick}
                      className={`block px-3 py-2 text-sm transition-colors hover:bg-background-light ${
                        isChildRouteActive
                          ? "bg-primary/10 text-primary font-medium border-r-2 border-primary"
                          : "text-text-medium hover:text-text-dark"
                      }`}
                      title={child.name}
                    >
                      {child.name}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    }
    
    return (
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
            isActive
              ? "bg-primary text-white"
              : "text-text-medium hover:bg-background-light hover:text-text-dark"
          }`}
        >
          <Icon className="w-5 h-5" />
          <span className="text-sm font-medium">{route.label}</span>
          <div className="ml-auto flex items-center gap-2">
            {isActive && (
              <div className="w-2 h-2 bg-white rounded-full opacity-75"></div>
            )}
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </div>
        </button>
        
        {isExpanded && route.children && (
          <div className="ml-6 mt-1 space-y-1">
            {route.children.map((child) => {
              const isChildRouteActive = location.pathname === child.href;
              return (
                <NavLink
                  key={child.href}
                  to={child.href}
                  onClick={onClick}
                  className={`block px-3 py-2 rounded-lg transition-colors text-sm ${
                    isChildRouteActive
                      ? "bg-primary/20 text-primary font-medium"
                      : "text-text-medium hover:bg-background-light hover:text-text-dark"
                  }`}
                >
                  {child.name}
                </NavLink>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const sidebarClasses = mobile
    ? "w-640bg-background-white h-full flex flex-col shadow-xl"
    : `hidden lg:block bg-background-white border-r border-border min-h-screen fixed left-0 top-16 z-20 transition-all duration-300 overflow-visible ${
        collapsed ? 'w-20' : 'w-60'
      }`;

  if (corporateLoading) {
    return (
      <nav className={sidebarClasses}>
        <div className="p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className={sidebarClasses}>
      {/* Mobile Header */}
      {mobile && (
        <div className="flex items-center justify-between p-4 border-b border-border">
          <NavLink
            to="/app/dashboard"
            className="flex items-center space-x-2"
            onClick={onClose}
          >
            <img src={leadwiseLogo} alt="Leadwise Logo" className="h-6" />
          </NavLink>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-text-medium hover:text-text-dark hover:bg-background-light transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* Desktop Sidebar Toggle Button */}
      {!mobile && onToggleCollapse && (
        <div className={`border-b border-border ${collapsed ? 'p-3' : 'p-4'}`}>
          <button
            onClick={onToggleCollapse}
            className={`flex items-center rounded-lg transition-all duration-200 text-text-light hover:text-text-dark hover:bg-background-medium ${
              collapsed 
                ? 'w-12 h-12 mx-auto justify-center' 
                : 'w-full gap-3 px-3 py-2 justify-start'
            }`}
            title={collapsed ? "Show Sidebar" : "Hide Sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="w-5 h-5" />
            ) : (
              <>
                <PanelLeftClose className="w-5 h-5" />
                <span className="text-sm font-medium">Hide Sidebar</span>
              </>
            )}
          </button>
        </div>
      )}

      <div className={`flex-1 ${collapsed ? 'overflow-visible' : 'overflow-y-auto'} p-2`}>
        {/* Corporate Section */}
        {shouldShowCorporateSection && (
          <div className={`${collapsed ? 'px-2' : 'p-4'} border-b border-border p-3`}>
            {!collapsed && (
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                Corporate Learning
              </h3>
            )}

            {/* IMPROVED: Show corporate navigation even during loading */}
            {shouldShowCorporateNav && (
              <>
                {!collapsed && (
                  <div className="mb-3">
                   
                    {corporateLoading && (
                      <div className="flex items-center gap-2 mt-1">
                        <Loader className="w-4 h-4 text-primary animate-spin" />
                        <span className="text-sm text-text-light">Loading...</span>
                      </div>
                    )}
                  </div>
                )}

           
                {/* Organization info */}
                {collapsed ? (
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={() => setCorporateExpanded(!corporateExpanded)}
                      className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center shadow-lg hover:bg-primary-dark transition-colors"
                      title={`${displayCompanyName} - Click to ${corporateExpanded ? 'collapse' : 'expand'} navigation`}
                    >
                      <span className="text-white font-semibold text-sm">
                        {displayCompanyName.split(' ').map(word => word.charAt(0)).join('').toUpperCase().slice(0, 3)}
                      </span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setCorporateExpanded(!corporateExpanded)}
                    className="mt-4 p-3 bg-background-dark rounded-lg w-full text-left hover:bg-background-medium transition-colors"
                    title={`Click to ${corporateExpanded ? 'collapse' : 'expand'} navigation`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                        <Building2 className="w-3 h-3 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-dark truncate">
                          {displayCompanyName}
                        </p>
                        <p className="text-sky-800 text-xs truncate"> 
                          {role || 'Manager'} • {organization?.subscription_status || 'Active'}
                          {corporateLoading && ' • Setting up...'}
                        </p>
                      </div>
                      <div className="text-text-muted">
                        {corporateExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </button>
                )}
                     {corporateExpanded && (
                  <nav className={`space-y-1 mb-6 ${collapsed ? 'space-y-2' : ''}`}>
                    {corporateLoading ? (
                      // Show loading state for navigation items
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="animate-pulse">
                            <div className="h-8 bg-gray-200 rounded"></div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      availableCorporateNavigation.map((route) => (
                        <NavItem 
                          key={route.path} 
                          route={route} 
                          onClick={mobile ? onClose : undefined}
                          collapsed={collapsed}
                        />
                      ))
                    )}
                  </nav>
                )}

              </>
            )}

            {/* IMPROVED: Setup prompt only when truly needed */}
            {shouldShowSetupPrompt && (
              collapsed ? (
                <div className="mt-4 flex justify-center">
                  <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center shadow-lg animate-pulse" title="Setup in Progress">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-yellow-600" />
                    <h3 className="text-sm font-semibold text-yellow-800">
                      {corporateError ? 'Setup Error' : 'Completing Setup'}
                    </h3>
                  </div>
                  <p className="text-xs text-yellow-700 mb-3">
                    {corporateError 
                      ? 'There was an issue setting up your organization. Please try again.'
                      : 'Your corporate account is being set up. This may take a moment.'}
                  </p>
                  <NavLink
                    to="/company/dashboard"
                    onClick={mobile ? onClose : undefined}
                    className="block w-full text-center bg-yellow-600 text-white text-xs py-2 px-3 rounded hover:bg-yellow-700 transition-colors"
                  >
                    {corporateError ? 'Retry Setup' : 'Continue to Dashboard'}
                  </NavLink>
                </div>
              )
            )}
          </div>
        )}

        {/* Organization Navigation for Individual Users */}
        {!isCorporateUser && !collapsed && <OrganizationNav />}

        {/* Course Management Navigation - Separate Section */}
        {courseManagementNavigation.length > 0 && (
          <div className={`${collapsed ? 'px-2' : 'p-4'} border-border p-3`}>
            {!collapsed && (
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                Course Management
              </h3>
            )}
            <nav className={`space-y-1 ${collapsed ? 'space-y-2' : ''}`}>
              {courseManagementNavigation.map((route) => (
                <NavItem 
                  key={route.path} 
                  route={route} 
                  onClick={mobile ? onClose : undefined}
                  collapsed={collapsed}
                />
              ))}
            </nav>
          </div>
        )}

        {/* Personal Navigation */}
        <div className={`${collapsed ? 'px-2' : 'p-4'} border-border p-3`}>
          {!collapsed && (
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              Personal Learning
            </h3>
          )}
          <nav className={`space-y-1 ${collapsed ? 'space-y-2' : ''}`}>
            {personalNavigation.map((route) => (
              route.children && route.children.length > 0 ? (
                <NavItemWithChildren 
                  key={route.path} 
                  route={route} 
                  onClick={mobile ? onClose : undefined}
                  collapsed={collapsed}
                />
              ) : (
                <NavItem 
                  key={route.path} 
                  route={route} 
                  onClick={mobile ? onClose : undefined}
                  collapsed={collapsed}
                />
              )
            ))}
          </nav>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {user?.user_metadata?.first_name?.[0] || 
               user?.email?.[0]?.toUpperCase() || 
               'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-dark truncate">
              {user?.user_metadata?.first_name || 
               user?.email?.split('@')[0] || 
               'User'}
            </p>
            <p className="text-xs text-text-muted truncate">
              {isCorporateUser 
                ? `${role || 'Manager'} at ${displayCompanyName}` 
                : 'Individual Account'}
            </p>
          </div>
        </div>
      </div>
    </nav>
  );
}
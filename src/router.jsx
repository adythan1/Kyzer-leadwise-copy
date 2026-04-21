// src/router.jsx - FIXED VERSION for AuthProvider pattern
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import CorporateGuard from "@/components/auth/CorporateGuard";
import AdminGuard from "@/components/auth/AdminGuard";
import CourseManagementGuard from "@/components/auth/CourseManagementGuard";
import SystemAdminGuard from "@/components/auth/SystemAdminGuard";
import AuthCallback from "@/pages/auth/AuthCallback";

// Public Pages
import Home from "@/pages/public/Home";
import About from "@/pages/public/About";
import Pricing from "@/pages/public/Pricing";
import Contact from "@/pages/public/Contact";
import ThemeDemo from "@/pages/public/ThemeDemo";
import PublicCertificateView from "@/pages/public/PublicCertificateView";
import PublicCourseSharePreview from "@/pages/public/PublicCourseSharePreview";

// Auth Pages
import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/SignUp";
import ResetPassword from "@/pages/auth/ResetPassword";
import VerifyEmail from "@/pages/auth/VerifyEmail";
import ForgotPassword from "@/pages/auth/ForgotPassword";

// Individual User Pages
import Dashboard from "@/pages/dashboard/Dashboard";
import Profile from "@/pages/dashboard/Profile";
import Settings from "@/pages/dashboard/Settings";
import CourseCatalog from "@/pages/courses/CourseCatalog";
import CourseDetail from "@/pages/courses/CourseDetail";
import LessonView from "@/pages/courses/LessonView";
import QuizView from "@/pages/courses/QuizView";
import MyCourses from "@/pages/courses/MyCourses";
import CourseCompletion from "@/pages/courses/CourseCompletion";
import CourseLearning from "@/pages/courses/CourseLearning";
import CourseManagement from "@/pages/courses/CourseManagement";
import CategoriesManagement from "@/pages/courses/CategoriesManagement";
import PresentationManagement from "@/pages/courses/PresentationManagement";
import CertificateTemplates from "@/pages/courses/CertificateTemplates";

// Admin Pages
import AdminPanel from "@/pages/admin/AdminPanel";

// Corporate Pages
import CompanyDashboard from "@/pages/corporate/CompanyDashboard";
import EmployeeManagement from "@/pages/corporate/EmployeeManagement";
import Reports from "@/pages/corporate/Reports";
import CompanySettings from "@/pages/corporate/CompanySettings";
import AcceptInvitation from "@/pages/corporate/AcceptInvitation";

// Error Pages
import NotFound from "@/components/common/NotFound";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import Certificates from "./pages/dashboard/Certificates";
import Progress from "./pages/dashboard/Progress";
import CourseEditor from "@/components/editor/CourseEditor";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    errorElement: <ErrorBoundary />,
    children: [
      // Public Routes
      { index: true, element: <Home /> },
      { path: "about", element: <About /> },
      { path: "pricing", element: <Pricing /> },
      { path: "contact", element: <Contact /> },
      { path: "theme-demo", element: <ThemeDemo /> },
      { path: "c/:shareToken", element: <PublicCertificateView /> },
      { path: "share/course/:courseId", element: <PublicCourseSharePreview /> },

      // Auth Routes
      { path: "login", element: <Login /> },
      { path: "signup", element: <Signup /> },
      { path: "reset-password", element: <ResetPassword /> },
      { path: "forgot-password", element: <ForgotPassword /> },
      { path: "verify-email", element: <VerifyEmail /> },

      // Accept invitation (special route)
      {
        path: "accept-invitation",
        element: (
          <ProtectedRoute>
            <AcceptInvitation />
          </ProtectedRoute>
        ),
      },
      {
        path: "/auth/callback",
        element: <AuthCallback />,
      },
      // Individual User Routes
      {
        path: "app",
        element: <ProtectedRoute />, // This will render <Outlet /> for nested routes
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: "dashboard", element: <Dashboard /> },
          { path: "profile", element: <Profile /> },
          { path: "settings", element: <Settings /> },
          { path: "editor/:courseId", element: <CourseEditor /> },
          {
            path: "admin",
            element: (
              <SystemAdminGuard>
                <AdminPanel />
              </SystemAdminGuard>
            ),
          },

                      {
              path: "courses",
              children: [
                { index: true, element: <MyCourses /> },
                { path: "catalog", element: <CourseCatalog /> },
                { 
                  path: "management", 
                  element: (
                    <CourseManagementGuard>
                      <CourseManagement />
                    </CourseManagementGuard>
                  ) 
                },
                { path: "categories", element: <CategoriesManagement /> },
                {
                  path: "certificate-templates",
                  element: (
                    <CourseManagementGuard>
                      <CertificateTemplates />
                    </CourseManagementGuard>
                  )
                },
                { path: ":courseId", element: <CourseDetail /> },
                { path: ":courseId/learning", element: <Navigate to="../" replace /> },
                { path: ":courseId/lesson/:lessonId/presentation", element: <PresentationManagement /> },
                { path: ":courseId/lesson/:lessonId", element: <LessonView /> },
                { path: ":courseId/quiz/:quizId", element: <QuizView /> },
                { path: ":courseId/completion", element: <CourseCompletion /> },
              ],
            },
          { path: "progress", element: <Progress /> },
          { path: "certificates", element: <Certificates /> },
        ],
      },

      // Corporate Routes
      {
        path: "company",
        element: (
          <ProtectedRoute>
            <CorporateGuard>
              <Outlet />
            </CorporateGuard>
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          {
            path: "dashboard",
            element: <CompanyDashboard />,
            description: "Company Dashboard",
          },
          {
            path: "employees",
            children: [
              {
                index: true,
                element: (
                  <AdminGuard requirePermission="invite_employees">
                    <EmployeeManagement />
                  </AdminGuard>
                ),
              },
            ],
          },
          {
            path: "reports",
            children: [
              {
                index: true,
                element: (
                  <AdminGuard requirePermission="view_reports">
                    <Reports />
                  </AdminGuard>
                ),
              },
            ],
          },
          {
            path: "settings",
            children: [
              {
                index: true,
                element: (
                  <AdminGuard requirePermission="manage_settings">
                    <CompanySettings />
                  </AdminGuard>
                ),
              },
            ],
          },
        ],
      },

      // Catch-all route
      { path: "*", element: <NotFound /> },
    ],
  },
]);

// Basic navigation configuration
export const navigationRoutes = {
  individual: [
    { path: "/app/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
    { path: "/app/courses", label: "My Courses", icon: "BookOpen" },
    { path: "/app/courses/catalog", label: "Course Catalog", icon: "Search" },
    { path: "/app/courses/management", label: "Course Management", icon: "Settings", permission: "manage_courses" },
    { path: "/app/progress", label: "Progress", icon: "TrendingUp" },
    { path: "/app/certificates", label: "Certificates", icon: "Award" },
  ],
  corporate: [
    { path: "/company/dashboard", label: "Dashboard", icon: "Building2" },
    {
      path: "/company/employees",
      label: "Employees",
      icon: "Users",
      permission: "invite_employees",
    },
    {
      path: "/company/reports",
      label: "Reports",
      icon: "BarChart3",
      permission: "view_reports",
    },
    {
      path: "/company/settings",
      label: "Settings",
      icon: "Settings",
      permission: "manage_settings",
    },
  ],
  user: [
    { path: "/app/profile", label: "Profile", icon: "User" },
    { path: "/app/settings", label: "Settings", icon: "Settings" },
  ],
};

// Helper functions
export const getAvailableRoutes = (routeGroup, permissions = {}) => {
  return (
    navigationRoutes[routeGroup]?.filter((route) => {
      if (!route.permission) return true;
      return permissions[route.permission] || false;
    }) || []
  );
};

export const getBreadcrumbs = (pathname) => {
  const breadcrumbConfig = {
    "/app/dashboard": [{ label: "Dashboard" }],
    "/app/courses": [{ label: "My Courses" }],
    "/app/courses/catalog": [
      { label: "Courses", path: "/app/courses" },
      { label: "Catalog" },
    ],
    "/company/dashboard": [{ label: "Company Dashboard" }],
    "/company/employees": [
      { label: "Company", path: "/company/dashboard" },
      { label: "Employees" },
    ],
    "/company/reports": [
      { label: "Company", path: "/company/dashboard" },
      { label: "Reports" },
    ],
    "/company/settings": [
      { label: "Company", path: "/company/dashboard" },
      { label: "Settings" },
    ],
  };

  return breadcrumbConfig[pathname] || [];
};

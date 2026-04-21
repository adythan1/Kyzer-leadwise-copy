// src/constants/permissions.js
// Centralized Permission Constants for RBAC

/**
 * Permission Categories and Individual Permissions
 * Use these constants instead of hardcoded strings throughout the application
 */

// ============================================
// PERMISSION CONSTANTS
// ============================================

export const PERMISSIONS = {
  // User Management
  INVITE_USERS: 'invite_employees',
  MANAGE_USERS: 'manage_employees',
  DELETE_USERS: 'delete_employees',
  VIEW_ALL_USERS: 'view_all_users',
  ASSIGN_ROLES: 'assign_roles',
  BULK_MANAGE_USERS: 'bulk_manage_users',

  // Department Management
  CREATE_DEPARTMENTS: 'create_departments',
  EDIT_DEPARTMENTS: 'edit_departments',
  DELETE_DEPARTMENTS: 'delete_departments',
  ASSIGN_DEPT_MANAGERS: 'assign_department_managers',

  // Course Management
  CREATE_COURSES: 'create_courses',
  EDIT_COURSES: 'edit_courses',
  DELETE_COURSES: 'delete_courses',
  PUBLISH_COURSES: 'publish_courses',
  MANAGE_COURSES: 'manage_courses',
  VIEW_COURSE_MANAGEMENT: 'view_course_management',

  // Course Content
  ADD_LESSONS: 'add_lessons',
  EDIT_LESSONS: 'edit_lessons',
  DELETE_LESSONS: 'delete_lessons',
  ADD_MODULES: 'add_modules',
  EDIT_MODULES: 'edit_modules',
  DELETE_MODULES: 'delete_modules',
  ADD_QUIZZES: 'add_quizzes',
  EDIT_QUIZZES: 'edit_quizzes',
  DELETE_QUIZZES: 'delete_quizzes',
  MANAGE_RESOURCES: 'manage_resources',

  // Course Assignment
  ASSIGN_COURSES: 'assign_courses',
  UNASSIGN_COURSES: 'unassign_courses',
  BULK_ASSIGN_COURSES: 'bulk_assign_courses',

  // Learning (All users have these)
  VIEW_COURSES: 'view_courses',
  ENROLL_COURSES: 'enroll_in_courses',
  TAKE_ASSESSMENTS: 'take_assessments',
  DOWNLOAD_CERTIFICATES: 'download_certificates',
  VIEW_OWN_PROGRESS: 'view_own_progress',
  EDIT_OWN_PROFILE: 'edit_own_profile',

  // Reports & Analytics
  VIEW_REPORTS: 'view_reports',
  GENERATE_REPORTS: 'generate_reports',
  VIEW_ANALYTICS: 'view_analytics',
  VIEW_ALL_PROGRESS: 'view_all_progress',
  EXPORT_REPORTS: 'export_reports',

  // Company/Organization Management
  MANAGE_COMPANY_SETTINGS: 'manage_company_settings',
  MANAGE_BILLING: 'manage_billing',
  MANAGE_INTEGRATIONS: 'manage_integrations',
  VIEW_COMPANY_SETTINGS: 'view_company_settings',

  // Assessment Grading
  GRADE_SUBMISSIONS: 'grade_submissions',
  VIEW_STUDENT_PROGRESS: 'view_student_progress',

  // System Administration
  MANAGE_PLATFORM_SETTINGS: 'manage_platform_settings',
  APPROVE_ORGANIZATIONS: 'approve_organizations',
  MANAGE_ALL_USERS: 'manage_all_users',
  VIEW_ALL_ORGANIZATIONS: 'view_all_organizations',
  SYSTEM_ADMIN_ACCESS: 'system_admin_access',
};

// ============================================
// ROLE DEFINITIONS
// ============================================

export const ROLES = {
  LEARNER: 'learner',
  CORPORATE_ADMIN: 'corporate_admin',
  INSTRUCTOR: 'instructor',
  SYSTEM_ADMIN: 'system_admin',
  OWNER: 'owner',

  // Legacy roles (for backwards compatibility)
  ADMIN: 'admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
};

// ============================================
// ROLE PERMISSIONS MAPPING
// ============================================

// Define learner permissions first
const LEARNER_PERMISSIONS = [
  PERMISSIONS.VIEW_COURSES,
  PERMISSIONS.ENROLL_COURSES,
  PERMISSIONS.TAKE_ASSESSMENTS,
  PERMISSIONS.DOWNLOAD_CERTIFICATES,
  PERMISSIONS.VIEW_OWN_PROGRESS,
  PERMISSIONS.EDIT_OWN_PROFILE,
];

export const ROLE_PERMISSIONS = {
  // Individual Learner
  [ROLES.LEARNER]: LEARNER_PERMISSIONS,

  // Corporate Administrator
  [ROLES.CORPORATE_ADMIN]: [
    // Has all learner permissions
    ...LEARNER_PERMISSIONS,

    // User Management
    PERMISSIONS.INVITE_USERS,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.DELETE_USERS,
    PERMISSIONS.VIEW_ALL_USERS,
    PERMISSIONS.ASSIGN_ROLES,
    PERMISSIONS.BULK_MANAGE_USERS,

    // Department Management
    PERMISSIONS.CREATE_DEPARTMENTS,
    PERMISSIONS.EDIT_DEPARTMENTS,
    PERMISSIONS.DELETE_DEPARTMENTS,
    PERMISSIONS.ASSIGN_DEPT_MANAGERS,

    // Course Assignment
    PERMISSIONS.ASSIGN_COURSES,
    PERMISSIONS.UNASSIGN_COURSES,
    PERMISSIONS.BULK_ASSIGN_COURSES,

    // Course Management (for corporate-owned catalog/course operations)
    PERMISSIONS.CREATE_COURSES,
    PERMISSIONS.EDIT_COURSES,
    PERMISSIONS.DELETE_COURSES,
    PERMISSIONS.PUBLISH_COURSES,
    PERMISSIONS.MANAGE_COURSES,
    PERMISSIONS.VIEW_COURSE_MANAGEMENT,

    // Course Content
    PERMISSIONS.ADD_LESSONS,
    PERMISSIONS.EDIT_LESSONS,
    PERMISSIONS.DELETE_LESSONS,
    PERMISSIONS.ADD_MODULES,
    PERMISSIONS.EDIT_MODULES,
    PERMISSIONS.DELETE_MODULES,
    PERMISSIONS.ADD_QUIZZES,
    PERMISSIONS.EDIT_QUIZZES,
    PERMISSIONS.DELETE_QUIZZES,
    PERMISSIONS.MANAGE_RESOURCES,

    // Reports & Analytics
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.GENERATE_REPORTS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_ALL_PROGRESS,
    PERMISSIONS.EXPORT_REPORTS,

    // Company Management
    PERMISSIONS.MANAGE_COMPANY_SETTINGS,
    PERMISSIONS.MANAGE_BILLING,
    PERMISSIONS.VIEW_COMPANY_SETTINGS,
  ],

  // Instructor / Course Creator
  [ROLES.INSTRUCTOR]: [
    // Learning permissions
    PERMISSIONS.VIEW_COURSES,
    PERMISSIONS.VIEW_OWN_PROGRESS,
    PERMISSIONS.EDIT_OWN_PROFILE,

    // Course Management
    PERMISSIONS.CREATE_COURSES,
    PERMISSIONS.EDIT_COURSES,
    PERMISSIONS.DELETE_COURSES,
    PERMISSIONS.PUBLISH_COURSES,
    PERMISSIONS.MANAGE_COURSES,
    PERMISSIONS.VIEW_COURSE_MANAGEMENT,

    // Course Content
    PERMISSIONS.ADD_LESSONS,
    PERMISSIONS.EDIT_LESSONS,
    PERMISSIONS.DELETE_LESSONS,
    PERMISSIONS.ADD_MODULES,
    PERMISSIONS.EDIT_MODULES,
    PERMISSIONS.DELETE_MODULES,
    PERMISSIONS.ADD_QUIZZES,
    PERMISSIONS.EDIT_QUIZZES,
    PERMISSIONS.DELETE_QUIZZES,
    PERMISSIONS.MANAGE_RESOURCES,

    // Assessment Grading
    PERMISSIONS.GRADE_SUBMISSIONS,
    PERMISSIONS.VIEW_STUDENT_PROGRESS,
  ],

  // Owner (creator of the organization)
  [ROLES.OWNER]: [
    // Has ALL permissions including organization deletion and ownership transfer
    ...Object.values(PERMISSIONS),
    // Additional owner-specific permissions
    PERMISSIONS.MANAGE_PLATFORM_SETTINGS, // Can manage organization at platform level
  ],

  // System Administrator
  [ROLES.SYSTEM_ADMIN]: [
    // Has ALL permissions
    ...Object.values(PERMISSIONS),
  ],

  // Legacy: Manager (limited permissions)
  [ROLES.MANAGER]: [
    PERMISSIONS.VIEW_COURSES,
    PERMISSIONS.ENROLL_COURSES,
    PERMISSIONS.VIEW_ALL_USERS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_ALL_PROGRESS,
    PERMISSIONS.ASSIGN_COURSES,
    PERMISSIONS.VIEW_OWN_PROGRESS,
    PERMISSIONS.EDIT_OWN_PROFILE,
  ],

  // Legacy: Employee (mapped to Learner)
  [ROLES.EMPLOYEE]: [
    ...LEARNER_PERMISSIONS,
  ],
};

// Legacy role mappings (defined after ROLE_PERMISSIONS is complete)
ROLE_PERMISSIONS[ROLES.ADMIN] = ROLE_PERMISSIONS[ROLES.CORPORATE_ADMIN];

// ============================================
// PERMISSION CATEGORIES (For UI Grouping)
// ============================================

export const PERMISSION_CATEGORIES = {
  USER_MANAGEMENT: {
    label: 'User Management',
    permissions: [
      PERMISSIONS.INVITE_USERS,
      PERMISSIONS.MANAGE_USERS,
      PERMISSIONS.DELETE_USERS,
      PERMISSIONS.VIEW_ALL_USERS,
      PERMISSIONS.ASSIGN_ROLES,
      PERMISSIONS.BULK_MANAGE_USERS,
    ],
  },
  DEPARTMENT_MANAGEMENT: {
    label: 'Department Management',
    permissions: [
      PERMISSIONS.CREATE_DEPARTMENTS,
      PERMISSIONS.EDIT_DEPARTMENTS,
      PERMISSIONS.DELETE_DEPARTMENTS,
      PERMISSIONS.ASSIGN_DEPT_MANAGERS,
    ],
  },
  COURSE_MANAGEMENT: {
    label: 'Course Management',
    permissions: [
      PERMISSIONS.CREATE_COURSES,
      PERMISSIONS.EDIT_COURSES,
      PERMISSIONS.DELETE_COURSES,
      PERMISSIONS.PUBLISH_COURSES,
      PERMISSIONS.MANAGE_COURSES,
      PERMISSIONS.VIEW_COURSE_MANAGEMENT,
    ],
  },
  CONTENT_MANAGEMENT: {
    label: 'Content Management',
    permissions: [
      PERMISSIONS.ADD_LESSONS,
      PERMISSIONS.EDIT_LESSONS,
      PERMISSIONS.DELETE_LESSONS,
      PERMISSIONS.ADD_MODULES,
      PERMISSIONS.EDIT_MODULES,
      PERMISSIONS.DELETE_MODULES,
      PERMISSIONS.ADD_QUIZZES,
      PERMISSIONS.EDIT_QUIZZES,
      PERMISSIONS.DELETE_QUIZZES,
      PERMISSIONS.MANAGE_RESOURCES,
    ],
  },
  LEARNING: {
    label: 'Learning',
    permissions: [
      PERMISSIONS.VIEW_COURSES,
      PERMISSIONS.ENROLL_COURSES,
      PERMISSIONS.TAKE_ASSESSMENTS,
      PERMISSIONS.DOWNLOAD_CERTIFICATES,
      PERMISSIONS.VIEW_OWN_PROGRESS,
      PERMISSIONS.EDIT_OWN_PROFILE,
    ],
  },
  REPORTS_ANALYTICS: {
    label: 'Reports & Analytics',
    permissions: [
      PERMISSIONS.VIEW_REPORTS,
      PERMISSIONS.GENERATE_REPORTS,
      PERMISSIONS.VIEW_ANALYTICS,
      PERMISSIONS.VIEW_ALL_PROGRESS,
      PERMISSIONS.EXPORT_REPORTS,
    ],
  },
  COMPANY_MANAGEMENT: {
    label: 'Company Management',
    permissions: [
      PERMISSIONS.MANAGE_COMPANY_SETTINGS,
      PERMISSIONS.MANAGE_BILLING,
      PERMISSIONS.MANAGE_INTEGRATIONS,
      PERMISSIONS.VIEW_COMPANY_SETTINGS,
    ],
  },
  SYSTEM_ADMIN: {
    label: 'System Administration',
    permissions: [
      PERMISSIONS.MANAGE_PLATFORM_SETTINGS,
      PERMISSIONS.APPROVE_ORGANIZATIONS,
      PERMISSIONS.MANAGE_ALL_USERS,
      PERMISSIONS.VIEW_ALL_ORGANIZATIONS,
      PERMISSIONS.SYSTEM_ADMIN_ACCESS,
    ],
  },
};

// ============================================
// HELPER CONSTANTS
// ============================================

export const ACCOUNT_TYPES = {
  INDIVIDUAL: 'individual',
  CORPORATE: 'corporate',
};

export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  SUSPENDED: 'suspended',
};

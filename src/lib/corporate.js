// src/lib/corporate.js
import { supabase } from './supabase'

// Corporate API helpers for Supabase operations
export const corporateAPI = {
  // Company operations
  async createCompany(companyData, userId) {
    const { data, error } = await supabase
      .from('organizations')
      .insert({
        ...companyData,
        admin_user_id: userId,
        subscription_status: 'trial',
        subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getCompanyByUser(userId) {
    // Check if user is admin of a company
    const { data: adminCompany, error: adminError } = await supabase
      .from('companies')
      .select('*')
      .eq('admin_user_id', userId)
      .single()

    if (adminCompany) return adminCompany

    // Check if user is employee of a company
    const { data: employeeRecord, error: empError } = await supabase
      .from('organization_employees')
      .select(`
        *,
        companies (*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (employeeRecord?.companies) return employeeRecord.companies

    return null
  },

  async updateCompany(companyId, updates) {
    const { data, error } = await supabase
      .from('companies')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', companyId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Employee operations
  async getCompanyEmployees(companyId) {
    const { data, error } = await supabase
      .from('organization_employees')
      .select(`
        *,
        users:user_id (
          id,
          email,
          user_metadata
        ),
        invited_by_user:invited_by (
          email,
          user_metadata
        )
      `)
      .eq('organization_id', companyId)
      .order('joined_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async inviteEmployee(companyId, email, role, invitedBy) {
    // Generate invitation token
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    const { data, error } = await supabase
      .from('employee_invitations')
      .insert({
        organization_id: companyId,
        email,
        token,
        role,
        invited_by: invitedBy,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return { ...data, inviteUrl: `${window.location.origin}/accept-invitation?token=${token}` }
  },

  async acceptInvitation(token, userId) {
    // Verify invitation token
    const { data: invitation, error: invError } = await supabase
      .from('employee_invitations')
      .select('*')
      .eq('token', token)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (invError || !invitation) {
      throw new Error('Invalid or expired invitation')
    }

    // Create employee record
    const { error: empError } = await supabase
      .from('organization_employees')
      .insert({
        organization_id: invitation.organization_id,
        user_id: userId,
        role: invitation.role,
        status: 'active',
        invited_by: invitation.invited_by,
        invited_at: invitation.created_at,
        joined_at: new Date().toISOString()
      })

    if (empError) throw empError

    // Mark invitation as used
    await supabase
      .from('employee_invitations')
      .update({ used_at: new Date().toISOString() })
      .eq('id', invitation.id)

    return true
  },

  async updateEmployeeRole(employeeId, role) {
    const { data, error } = await supabase
      .from('organization_employees')
      .update({ role })
      .eq('id', employeeId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async removeEmployee(employeeId) {
    const { error } = await supabase
      .from('organization_employees')
      .delete()
      .eq('id', employeeId)

    if (error) throw error
    return true
  },

  // Course assignment operations
  async getCompanyCourseAssignments(companyId) {
    const { data, error } = await supabase
      .from('organization_course_assignments')
      .select(`
        *,
        courses (*),
        assigned_by_user:assigned_by (
          email,
          user_metadata
        )
      `)
      .eq('organization_id', companyId)
      .order('assigned_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async assignCourseToCompany(companyId, courseId, assignedBy, options = {}) {
    const { data, error } = await supabase
      .from('organization_course_assignments')
      .insert({
        organization_id: companyId,
        course_id: courseId,
        assigned_by: assignedBy,
        due_date: options.dueDate,
        is_mandatory: options.isMandatory || false
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Department operations
  async getCompanyDepartments(companyId) {
    const { data, error } = await supabase
      .from('organization_departments')
      .select(`
        *,
        manager:manager_id (
          email,
          user_metadata
        ),
        employee_count:employee_departments(count)
      `)
      .eq('organization_id', companyId)

    if (error) throw error
    return data || []
  },

  async createDepartment(companyId, departmentData) {
    const { data, error } = await supabase
      .from('organization_departments')
      .insert({
        ...departmentData,
        organization_id: companyId
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Invitation operations
  async getCompanyInvitations(companyId) {
    const { data, error } = await supabase
      .from('employee_invitations')
      .select(`
        *,
        invited_by_user:invited_by (
          email,
          user_metadata
        )
      `)
      .eq('organization_id', companyId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async resendInvitation(invitationId) {
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    
    const { data, error } = await supabase
      .from('employee_invitations')
      .update({ expires_at: newExpiresAt.toISOString() })
      .eq('id', invitationId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteInvitation(invitationId) {
    const { error } = await supabase
      .from('employee_invitations')
      .delete()
      .eq('id', invitationId)

    if (error) throw error
    return true
  },

  // Analytics and reporting
  async getCompanyStats(companyId) {
    try {
      // Get employee stats
      const { count: totalEmployees } = await supabase
        .from('organization_employees')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', companyId)
        .eq('status', 'active')

      const { count: pendingInvites } = await supabase
        .from('employee_invitations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', companyId)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())

      // Get course completion stats (this would need to join with enrollments table)
      // For now, return mock data
      const coursesCompleted = Math.floor(Math.random() * 50) + 10
      const coursesInProgress = Math.floor(Math.random() * 30) + 5

      return {
        totalEmployees: totalEmployees || 0,
        pendingInvites: pendingInvites || 0,
        coursesCompleted,
        coursesInProgress
      }
    } catch (error) {
      console.error('Error fetching company stats:', error)
      return {
        totalEmployees: 0,
        pendingInvites: 0,
        coursesCompleted: 0,
        coursesInProgress: 0
      }
    }
  }
}

// Utility functions for corporate features
export const corporateUtils = {
  // Email validation
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  // Parse CSV content for bulk employee invitations
  parseEmployeeCSV(csvContent) {
    const lines = csvContent.split('\n').filter(line => line.trim())
    const employees = []
    
    // Skip header row if it exists
    const startIndex = lines[0]?.toLowerCase().includes('email') ? 1 : 0
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i]
      const parts = line.split(',').map(part => part.trim().replace(/"/g, ''))
      
      if (parts.length >= 1 && this.validateEmail(parts[0])) {
        employees.push({
          email: parts[0],
          role: parts[1] || 'employee',
          name: parts[2] || '',
          department: parts[3] || ''
        })
      }
    }
    
    return employees
  },

  // Generate invitation email content
  generateInvitationEmail(invitation, company, invitedBy) {
    const inviteUrl = `${window.location.origin}/accept-invitation?token=${invitation.token}`
    
    return {
      subject: `You're invited to join ${company.name} on Leadwise Academy`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #374151;">You're invited to join ${company.name}</h2>
          
          <p>Hi there!</p>
          
          <p><strong>${invitedBy.email}</strong> has invited you to join <strong>${company.name}</strong>'s learning platform on Leadwise Academy.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #374151;">Company: ${company.name}</h3>
            <p style="margin: 0; color: #6b7280;">Role: ${invitation.role}</p>
            <p style="margin: 5px 0 0 0; color: #6b7280;">Industry: ${company.industry || 'Not specified'}</p>
          </div>
          
          <h4>What you'll get access to:</h4>
          <ul>
            <li>Company-assigned courses and training materials</li>
            <li>Progress tracking and achievements</li>
            <li>Completion certificates</li>
            <li>Team collaboration features</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" 
               style="background: #374151; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            This invitation expires on ${new Date(invitation.expires_at).toLocaleDateString()}.
            If you can't click the button, copy and paste this link: ${inviteUrl}
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            This invitation was sent by ${company.name} via Leadwise Academy.
            If you weren't expecting this invitation, you can safely ignore this email.
          </p>
        </div>
      `,
      text: `
        You're invited to join ${company.name}
        
        ${invitedBy.email} has invited you to join ${company.name}'s learning platform on Leadwise Academy.
        
        Company: ${company.name}
        Role: ${invitation.role}
        Industry: ${company.industry || 'Not specified'}
        
        Accept your invitation: ${inviteUrl}
        
        This invitation expires on ${new Date(invitation.expires_at).toLocaleDateString()}.
      `
    }
  },

  // Format company subscription status
  formatSubscriptionStatus(company) {
    const now = new Date()
    const expiresAt = new Date(company.subscription_expires_at)
    const daysUntilExpiry = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24))
    
    return {
      status: company.subscription_status,
      isExpired: expiresAt < now,
      daysUntilExpiry,
      isActive: company.subscription_status === 'active',
      isTrial: company.subscription_status === 'trial',
      expiryDate: expiresAt,
      statusLabel: company.subscription_status === 'trial' ? 'Trial' : 
                  company.subscription_status === 'active' ? 'Active' : 'Expired'
    }
  },

  // Calculate employee utilization
  calculateUtilization(currentEmployees, limit) {
    const percentage = Math.round((currentEmployees / limit) * 100)
    return {
      current: currentEmployees,
      limit,
      percentage,
      available: limit - currentEmployees,
      isNearLimit: percentage > 80,
      isFull: percentage >= 100
    }
  },

  // Generate employee progress report data
  generateProgressReport(employees, enrollments = []) {
    return employees.map(employee => {
      // In a real app, you'd calculate this from actual enrollment data
      const employeeEnrollments = enrollments.filter(e => e.user_id === employee.user_id)
      const completed = employeeEnrollments.filter(e => e.completion_status === 'completed').length
      const inProgress = employeeEnrollments.filter(e => e.completion_status === 'in_progress').length
      const total = employeeEnrollments.length
      
      return {
        ...employee,
        totalCourses: total,
        completedCourses: completed,
        inProgressCourses: inProgress,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        lastActivity: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      }
    })
  },

  // Export data to CSV
  exportToCSV(data, filename) {
    if (!Array.isArray(data) || data.length === 0) return

    const headers = Object.keys(data[0]).filter(key => typeof data[0][key] !== 'function')
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header]
          if (value === null || value === undefined) return ''
          if (typeof value === 'string' && value.includes(',')) return `"${value}"`
          return value
        }).join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  },

  // Validate company domain
  validateDomain(domain) {
    if (!domain) return true // Domain is optional
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/
    return domainRegex.test(domain)
  },

  // Check if email matches company domain
  emailMatchesDomain(email, domain) {
    if (!domain) return false
    const emailDomain = email.split('@')[1]
    return emailDomain?.toLowerCase() === domain.toLowerCase()
  },

  // Format role display name
  formatRole(role) {
    const roleMap = {
      admin: 'Administrator',
      manager: 'Manager',
      employee: 'Employee'
    }
    return roleMap[role] || role
  },

  // Get role permissions
  getRolePermissions(role) {
    const permissions = {
      admin: [
        'canViewDashboard',
        'canViewEmployees',
        'canInviteEmployees',
        'canManageEmployees',
        'canAssignCourses',
        'canViewReports',
        'canManageCompany',
        'canViewBilling',
        'canManagePermissions'
      ],
      manager: [
        'canViewDashboard',
        'canViewEmployees',
        'canInviteEmployees',
        'canManageEmployees',
        'canAssignCourses',
        'canViewReports'
      ],
      employee: [
        'canViewDashboard',
        'canViewEmployees'
      ]
    }
    return permissions[role] || []
  }
}

// Error handling utilities
export const corporateErrors = {
  ORGANIZATION_NOT_FOUND: 'Company not found',
  EMPLOYEE_LIMIT_REACHED: 'Employee limit reached',
  INVALID_INVITATION: 'Invalid or expired invitation',
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions',
  SUBSCRIPTION_EXPIRED: 'Subscription has expired',
  INVALID_EMAIL: 'Invalid email address',
  INVALID_DOMAIN: 'Invalid domain format',
  
  handleError(error) {
    console.error('Corporate operation error:', error)
    
    if (error.message?.includes('Employee limit reached')) {
      return this.EMPLOYEE_LIMIT_REACHED
    }
    
    if (error.message?.includes('Invalid or expired invitation')) {
      return this.INVALID_INVITATION
    }
    
    return error.message || 'An unexpected error occurred'
  }
}

// Constants for corporate features
export const corporateConstants = {
  ROLES: {
    ADMIN: 'admin',
    MANAGER: 'manager',
    EMPLOYEE: 'employee'
  },
  
  SUBSCRIPTION_STATUS: {
    TRIAL: 'trial',
    ACTIVE: 'active',
    EXPIRED: 'expired'
  },
  
  EMPLOYEE_STATUS: {
    ACTIVE: 'active',
    PENDING: 'pending',
    INACTIVE: 'inactive'
  },
  
  DEFAULT_EMPLOYEE_LIMIT: 200,
  TRIAL_DURATION_DAYS: 30,
  INVITATION_DURATION_DAYS: 7,
  
  INDUSTRIES: [
    'Technology',
    'Healthcare',
    'Finance',
    'Education',
    'Manufacturing',
    'Retail',
    'Consulting',
    'Government',
    'Non-profit',
    'Other'
  ],
  
  ORGANIZATION_SIZES: [
    '1-10',
    '11-50', 
    '51-200',
    '200+'
  ]
}
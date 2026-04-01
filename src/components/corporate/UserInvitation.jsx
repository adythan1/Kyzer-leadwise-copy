// src/components/corporate/UserInvitation.jsx
import { useState, useEffect } from 'react'
import { 
  UserPlus, 
  Mail, 
  Users, 
  Upload, 
  Download,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Trash2,
  Edit,
  Send,
  Copy,
  Eye,
  EyeOff,
  Search,
  Clock,
  MoreVertical,
  Plus
} from 'lucide-react'
import { useCorporateStore, useDepartments, useInvitations } from '@/store/corporateStore'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import MetricTile from '@/components/ui/MetricTile'
import Modal from '@/components/ui/Modal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import CreateUserDirectModal from './CreateUserDirectModal'

export default function UserInvitation() {
  const departments = useDepartments()
  const invitations = useInvitations()
  const { 
    fetchDepartments,
    fetchInvitations,
    inviteEmployee,
    createUserDirect,
    bulkInviteEmployees,
    resendInvitation,
    deleteInvitation,
    loading,
    error
  } = useCorporateStore()

  const [activeTab, setActiveTab] = useState('single')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterRole, setFilterRole] = useState('all')
  const [selectedInvitations, setSelectedInvitations] = useState([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [invitationToDelete, setInvitationToDelete] = useState(null)

  useEffect(() => {
    fetchDepartments()
    fetchInvitations()
  }, [])

  // Filter invitations based on search and filters
  const filteredInvitations = invitations.filter(invitation => {
    const matchesSearch = invitation.email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || invitation.status === filterStatus
    const matchesRole = filterRole === 'all' || invitation.role === filterRole
    
    return matchesSearch && matchesStatus && matchesRole
  })

  const handleSingleInvite = async (invitationData) => {
    try {
      await inviteEmployee(
        invitationData.email,
        invitationData.role,
        invitationData.departmentId,
        invitationData.customMessage
      )
      setShowInviteModal(false)
    } catch (error) {
      // Error is handled by the store
    }
  }

  const handleBulkInvite = async (invitations) => {
    try {
      await bulkInviteEmployees(invitations)
      setShowBulkModal(false)
    } catch (error) {
      // Error is handled by the store
    }
  }

  const handleResendInvitation = async (invitationId) => {
    try {
      await resendInvitation(invitationId)
    } catch (error) {
      // Error is handled by the store
    }
  }

  const handleDeleteInvitation = async (invitationId) => {
    try {
      await deleteInvitation(invitationId)
      setSelectedInvitations(prev => prev.filter(id => id !== invitationId))
    } catch (error) {
      // Error is handled by the store
    }
  }

  const handleBulkDelete = async () => {
    try {
      for (const invitationId of selectedInvitations) {
        await deleteInvitation(invitationId)
      }
      setSelectedInvitations([])
    } catch (error) {
      // Error is handled by the store
    }
  }

  const confirmDelete = (invitation) => {
    setInvitationToDelete(invitation)
    setShowDeleteConfirm(true)
  }

  const executeDelete = async () => {
    if (invitationToDelete) {
      await handleDeleteInvitation(invitationToDelete.id)
      setShowDeleteConfirm(false)
      setInvitationToDelete(null)
    }
  }

  const toggleInvitationSelection = (invitationId) => {
    setSelectedInvitations(prev => 
      prev.includes(invitationId) 
        ? prev.filter(id => id !== invitationId)
        : [...prev, invitationId]
    )
  }

  const selectAllInvitations = () => {
    setSelectedInvitations(filteredInvitations.map(inv => inv.id))
  }

  const clearSelection = () => {
    setSelectedInvitations([])
  }

  const copyInvitationLink = (invitationId) => {
    const link = `${window.location.origin}/auth/accept-invitation?token=${invitationId}`
    navigator.clipboard.writeText(link)
    // You could add a toast notification here
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return Clock
      case 'accepted': return CheckCircle
      case 'expired': return XCircle
      default: return AlertCircle
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-warning-default bg-warning-light'
      case 'accepted': return 'text-success-default bg-success-light'
      case 'expired': return 'text-error-default bg-error-light'
      default: return 'text-text-muted bg-background-medium'
    }
  }

  const isExpired = (expiresAt) => {
    return new Date(expiresAt) < new Date()
  }

  return (
    <div className="space-y-6">
       {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-text-dark">User Invitations - ENHANCED VERSION</h2>
          <p className="text-text-light">
            Invite new users to join your organization - WITH DELETE FUNCTIONALITY
          </p>
          <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded">
            <p className="text-red-800 text-sm font-bold">🚀 NEW: Bulk delete, checkboxes, and confirmation modals are now available!</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {selectedInvitations.length > 0 && (
            <div className="flex gap-2 mr-4">
              <Button 
                variant="outline" 
                onClick={clearSelection}
                size="sm"
              >
                Clear Selection ({selectedInvitations.length})
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleBulkDelete}
                size="sm"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected
              </Button>
            </div>
          )}
          <Button 
            variant="outline" 
            onClick={() => setShowBulkModal(true)}
          >
            <Upload className="w-4 h-4 mr-2" />
            Bulk Invite
          </Button>
          <Button 
            variant="outline"
            onClick={() => setShowCreateUserModal(true)}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add User Directly
          </Button>
          <Button onClick={() => setShowInviteModal(true)}>
            <Mail className="w-4 h-4 mr-2" />
            Invite by Email
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricTile
          title="Total Invitations"
          value={invitations.length}
          variant="blue"
          icon={Mail}
          paddingClassName="p-4"
        />
        <MetricTile
          title="Pending"
          value={invitations.filter((inv) => inv.status === 'pending' && !isExpired(inv.expires_at)).length}
          variant="orange"
          icon={Clock}
          paddingClassName="p-4"
        />
        <MetricTile
          title="Accepted"
          value={invitations.filter((inv) => inv.status === 'accepted').length}
          variant="green"
          icon={CheckCircle}
          paddingClassName="p-4"
        />
        <MetricTile
          title="Expired"
          value={invitations.filter((inv) => isExpired(inv.expires_at)).length}
          variant="error"
          icon={XCircle}
          paddingClassName="p-4"
        />
      </div>

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search invitations..."
              className="w-full pl-10 pr-4 py-2 border border-background-dark rounded-lg focus:ring-2 focus:ring-primary-default focus:border-primary-default"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <select
            className="px-3 py-2 border border-background-dark rounded-lg focus:ring-2 focus:ring-primary-default focus:border-primary-default"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="expired">Expired</option>
          </select>

          {/* Role Filter */}
          <select
            className="px-3 py-2 border border-background-dark rounded-lg focus:ring-2 focus:ring-primary-default focus:border-primary-default"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="employee">Employee</option>
          </select>
        </div>
      </Card>

      {/* Invitation List */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-background-dark">
                <th className="text-left py-3 px-4 font-medium text-text-dark">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedInvitations.length === filteredInvitations.length && filteredInvitations.length > 0}
                      onChange={selectedInvitations.length === filteredInvitations.length ? clearSelection : selectAllInvitations}
                      className="rounded border-background-dark"
                    />
                    <span className="text-xs text-blue-600">✓ Enhanced</span>
                  </div>
                </th>
                <th className="text-left py-3 px-4 font-medium text-text-dark">Email</th>
                <th className="text-left py-3 px-4 font-medium text-text-dark">Role</th>
                <th className="text-left py-3 px-4 font-medium text-text-dark">Department</th>
                <th className="text-left py-3 px-4 font-medium text-text-dark">Status</th>
                <th className="text-left py-3 px-4 font-medium text-text-dark">Invited By</th>
                <th className="text-left py-3 px-4 font-medium text-text-dark">Expires</th>
                <th className="text-right py-3 px-4 font-medium text-text-dark">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-8">
                    <LoadingSpinner />
                  </td>
                </tr>
              ) : filteredInvitations.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-text-light">
                    No invitations found matching your criteria
                  </td>
                </tr>
              ) : (
                filteredInvitations.map((invitation) => (
                  <InvitationRow 
                    key={invitation.id} 
                    invitation={invitation}
                    isSelected={selectedInvitations.includes(invitation.id)}
                    onToggleSelection={toggleInvitationSelection}
                    onResend={handleResendInvitation}
                    onDelete={confirmDelete}
                    onCopyLink={copyInvitationLink}
                    isExpired={isExpired(invitation.expires_at)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Single Invite Modal */}
      <SingleInviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSubmit={handleSingleInvite}
        departments={departments}
        loading={loading}
      />

      {/* Bulk Invite Modal */}
      <BulkInviteModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onSubmit={handleBulkInvite}
        departments={departments}
        loading={loading}
      />

      {/* Create User Directly Modal */}
      <CreateUserDirectModal
        isOpen={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
        onCreate={createUserDirect}
        departments={departments}
        loading={loading}
      />

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={showDeleteConfirm} 
        onClose={() => setShowDeleteConfirm(false)} 
        title="Delete Invitation"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-error-light rounded-full flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-error-default" />
            </div>
            <div>
              <h3 className="font-semibold text-text-dark">Delete Invitation</h3>
              <p className="text-text-light text-sm">
                This action cannot be undone.
              </p>
            </div>
          </div>
          
          {invitationToDelete && (
            <div className="bg-background-light rounded-lg p-4">
              <p className="text-sm text-text-dark">
                <strong>Email:</strong> {invitationToDelete.email}
              </p>
              <p className="text-sm text-text-dark">
                <strong>Role:</strong> {invitationToDelete.role}
              </p>
              <p className="text-sm text-text-dark">
                <strong>Status:</strong> {invitationToDelete.status}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              variant="ghost" 
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={executeDelete}
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete Invitation'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// Invitation Row Component
function InvitationRow({ invitation, isSelected, onToggleSelection, onResend, onDelete, onCopyLink, isExpired }) {
  const [showActions, setShowActions] = useState(false)
  const [showMessage, setShowMessage] = useState(false)

  const StatusIcon = getStatusIcon(invitation.status)
  const statusColor = getStatusColor(invitation.status)

  return (
    <tr className={`border-b border-background-light hover:bg-background-light ${isSelected ? 'bg-primary-light/10' : ''}`}>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelection(invitation.id)}
            className="rounded border-background-dark"
          />
          {isSelected && <span className="text-xs text-green-600">✓</span>}
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-light rounded-full flex items-center justify-center">
            <Mail className="w-4 h-4 text-primary-default" />
          </div>
          <div>
            <p className="font-medium text-text-dark">{invitation.email}</p>
            {invitation.custom_message && (
              <button
                onClick={() => setShowMessage(!showMessage)}
                className="text-xs text-primary-default hover:underline"
              >
                {showMessage ? 'Hide message' : 'View message'}
              </button>
            )}
          </div>
        </div>
        {showMessage && invitation.custom_message && (
          <div className="mt-2 p-2 bg-background-light rounded text-sm text-text-light">
            {invitation.custom_message}
          </div>
        )}
      </td>
      
      <td className="py-3 px-4">
        <span className="capitalize text-text-dark">{invitation.role}</span>
      </td>
      
      <td className="py-3 px-4">
        <span className="text-text-light">
          {invitation.departments?.name || 'No department'}
        </span>
      </td>
      
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <StatusIcon className="w-4 h-4" />
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
            {invitation.status}
            {isExpired && invitation.status === 'pending' && ' (Expired)'}
          </span>
        </div>
      </td>
      
      <td className="py-3 px-4 text-text-light">
        {invitation.inviter?.full_name || invitation.inviter?.email || 'Unknown'}
      </td>
      
      <td className="py-3 px-4 text-text-light">
        {new Date(invitation.expires_at).toLocaleDateString()}
      </td>
      
      <td className="py-3 px-4 text-right">
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowActions(!showActions)}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
          
          {showActions && (
            <div className="absolute right-0 top-8 w-48 bg-white border border-background-dark rounded-lg shadow-lg z-10">
              {invitation.status === 'pending' && !isExpired && (
                <button
                  onClick={() => {
                    onResend(invitation.id)
                    setShowActions(false)
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-background-light flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Resend Invitation
                </button>
              )}
              <button
                onClick={() => {
                  onCopyLink(invitation.id)
                  setShowActions(false)
                }}
                className="w-full text-left px-4 py-2 hover:bg-background-light flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy Invitation Link
              </button>
              <button
                onClick={() => {
                  onDelete(invitation)
                  setShowActions(false)
                }}
                className="w-full text-left px-4 py-2 hover:bg-background-light text-error-default flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Invitation
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

// Single Invite Modal Component
function SingleInviteModal({ isOpen, onClose, onSubmit, departments, loading }) {
  const [formData, setFormData] = useState({
    email: '',
    role: 'employee',
    departmentId: '',
    customMessage: ''
  })
  const [errors, setErrors] = useState({})

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Basic validation
    const newErrors = {}
    if (!formData.email) newErrors.email = 'Email is required'
    if (!formData.email.includes('@')) newErrors.email = 'Valid email is required'
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      await onSubmit(formData)
      setFormData({ email: '', role: 'employee', departmentId: '', customMessage: '' })
      setErrors({})
    } catch (error) {
      setErrors({ submit: error.message })
    }
  }

  const handleClose = () => {
    setFormData({ email: '', role: 'employee', departmentId: '', customMessage: '' })
    setErrors({})
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Invite User">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-dark mb-2">
            Email Address *
          </label>
          <input
            type="email"
            required
            className="w-full p-3 border border-background-dark rounded-lg focus:ring-2 focus:ring-primary-default focus:border-primary-default"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="user@company.com"
          />
          {errors.email && (
            <p className="text-error-default text-sm mt-1">{errors.email}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-dark mb-2">
              Role
            </label>
            <select
              className="w-full p-3 border border-background-dark rounded-lg focus:ring-2 focus:ring-primary-default focus:border-primary-default"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-dark mb-2">
              Department
            </label>
            <select
              className="w-full p-3 border border-background-dark rounded-lg focus:ring-2 focus:ring-primary-default focus:border-primary-default"
              value={formData.departmentId}
              onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
            >
              <option value="">No department</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-dark mb-2">
            Custom Message (Optional)
          </label>
          <textarea
            className="w-full p-3 border border-background-dark rounded-lg focus:ring-2 focus:ring-primary-default focus:border-primary-default"
            rows="3"
            value={formData.customMessage}
            onChange={(e) => setFormData({ ...formData, customMessage: e.target.value })}
            placeholder="Add a personal message to the invitation..."
          />
        </div>

        {errors.submit && (
          <div className="p-3 bg-error-light border border-error-default rounded-lg">
            <p className="text-error-default text-sm">{errors.submit}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send Invitation'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// Bulk Invite Modal Component
function BulkInviteModal({ isOpen, onClose, onSubmit, departments, loading }) {
  const [invitations, setInvitations] = useState([])
  const [csvData, setCsvData] = useState('')
  const [showCsvInput, setShowCsvInput] = useState(false)
  const [errors, setErrors] = useState({})

  const handleCsvUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      setCsvData(e.target.result)
      parseCsvData(e.target.result)
    }
    reader.readAsText(file)
  }

  const parseCsvData = (csv) => {
    const lines = csv.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    
    const parsedInvitations = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim())
      const invitation = {}
      
      headers.forEach((header, index) => {
        const value = values[index] || ''
        switch (header) {
          case 'email':
            invitation.email = value
            break
          case 'role':
            invitation.role = value || 'employee'
            break
          case 'department':
            const department = departments.find(d => d.name.toLowerCase() === value.toLowerCase())
            invitation.departmentId = department?.id || ''
            break
          case 'message':
            invitation.customMessage = value
            break
        }
      })
      
      return invitation
    }).filter(inv => inv.email)

    setInvitations(parsedInvitations)
  }

  const handleManualAdd = () => {
    setInvitations([...invitations, {
      email: '',
      role: 'employee',
      departmentId: '',
      customMessage: ''
    }])
  }

  const handleInvitationChange = (index, field, value) => {
    const updated = [...invitations]
    updated[index][field] = value
    setInvitations(updated)
  }

  const handleRemoveInvitation = (index) => {
    setInvitations(invitations.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validation
    const validInvitations = invitations.filter(inv => inv.email && inv.email.includes('@'))
    if (validInvitations.length === 0) {
      setErrors({ submit: 'Please add at least one valid invitation' })
      return
    }

    try {
      await onSubmit(validInvitations)
      setInvitations([])
      setCsvData('')
      setErrors({})
    } catch (error) {
      setErrors({ submit: error.message })
    }
  }

  const handleClose = () => {
    setInvitations([])
    setCsvData('')
    setErrors({})
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Bulk Invite Users" size="lg">
      <div className="space-y-6">
        {/* Upload Options */}
        <div className="flex gap-4">
          <Button
            variant={!showCsvInput ? "primary" : "outline"}
            onClick={() => setShowCsvInput(false)}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Manual Entry
          </Button>
          <Button
            variant={showCsvInput ? "primary" : "outline"}
            onClick={() => setShowCsvInput(true)}
          >
            <Upload className="w-4 h-4 mr-2" />
            CSV Upload
          </Button>
        </div>

        {showCsvInput ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-dark mb-2">
                Upload CSV File
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="w-full p-3 border border-background-dark rounded-lg focus:ring-2 focus:ring-primary-default focus:border-primary-default"
              />
              <p className="text-sm text-text-light mt-1">
                CSV format: email, role, department, message
              </p>
            </div>

            {csvData && (
              <div className="p-4 bg-background-light rounded-lg">
                <h4 className="font-medium text-text-dark mb-2">Preview ({invitations.length} invitations)</h4>
                <div className="max-h-40 overflow-y-auto">
                  {invitations.map((inv, index) => (
                    <div key={`preview-${inv.email}-${index}`} className="text-sm text-text-light">
                      {inv.email} - {inv.role} - {departments.find(d => d.id === inv.departmentId)?.name || 'No department'}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-text-dark">Invitations ({invitations.length})</h4>
              <Button onClick={handleManualAdd} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Row
              </Button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {invitations.map((invitation, index) => (
                <div key={`invitation-${invitation.email}-${index}`} className="grid grid-cols-12 gap-2 items-center p-2 border border-background-dark rounded">
                  <div className="col-span-4">
                    <input
                      type="email"
                      placeholder="email@company.com"
                      className="w-full p-2 text-sm border border-background-dark rounded focus:ring-1 focus:ring-primary-default"
                      value={invitation.email}
                      onChange={(e) => handleInvitationChange(index, 'email', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <select
                      className="w-full p-2 text-sm border border-background-dark rounded focus:ring-1 focus:ring-primary-default"
                      value={invitation.role}
                      onChange={(e) => handleInvitationChange(index, 'role', e.target.value)}
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="col-span-3">
                    <select
                      className="w-full p-2 text-sm border border-background-dark rounded focus:ring-1 focus:ring-primary-default"
                      value={invitation.departmentId}
                      onChange={(e) => handleInvitationChange(index, 'departmentId', e.target.value)}
                    >
                      <option value="">No department</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Message (optional)"
                      className="w-full p-2 text-sm border border-background-dark rounded focus:ring-1 focus:ring-primary-default"
                      value={invitation.customMessage}
                      onChange={(e) => handleInvitationChange(index, 'customMessage', e.target.value)}
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveInvitation(index)}
                      className="text-error-default"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {errors.submit && (
          <div className="p-3 bg-error-light border border-error-default rounded-lg">
            <p className="text-error-default text-sm">{errors.submit}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || invitations.length === 0}
          >
            {loading ? 'Sending...' : `Send ${invitations.length} Invitations`}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// Helper functions
function getStatusIcon(status) {
  switch (status) {
    case 'pending': return Clock
    case 'accepted': return CheckCircle
    case 'expired': return XCircle
    default: return AlertCircle
  }
}

function getStatusColor(status) {
  switch (status) {
    case 'pending': return 'text-warning-default bg-warning-light'
    case 'accepted': return 'text-success-default bg-success-light'
    case 'expired': return 'text-error-default bg-error-light'
    default: return 'text-text-muted bg-background-medium'
  }
}

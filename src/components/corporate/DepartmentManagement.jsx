// src/components/corporate/DepartmentManagement.jsx
import { useState, useEffect } from 'react'
import { 
  Building2, 
  Plus, 
  Search, 
  Filter,
  Users,
  Edit,
  Trash2,
  MoreVertical,
  UserCheck,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { useCorporateStore, useDepartments, useCurrentCompany, useEmployees } from '@/store/corporateStore'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import MetricTile from '@/components/ui/MetricTile'
import Modal from '@/components/ui/Modal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function DepartmentManagement() {
  const currentCompany = useCurrentCompany()
  const departments = useDepartments()
  const employees = useEmployees()
  const { 
    fetchDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    loading,
    error
  } = useCorporateStore()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterManager, setFilterManager] = useState('all')

  useEffect(() => {
    fetchDepartments()
  }, [])

  // Filter departments based on search and filters
  const filteredDepartments = departments.filter(department => {
    const matchesSearch = department.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         department.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesManager = filterManager === 'all' || 
                          (filterManager === 'assigned' && department.manager_id) ||
                          (filterManager === 'unassigned' && !department.manager_id)
    
    return matchesSearch && matchesManager
  })

  const handleCreateDepartment = async (departmentData) => {
    try {
      await createDepartment(departmentData)
      setShowCreateModal(false)
    } catch (error) {
      // Error is handled by the store
    }
  }

  const handleUpdateDepartment = async (departmentId, updates) => {
    try {
      await updateDepartment(departmentId, updates)
      setShowEditModal(false)
      setSelectedDepartment(null)
    } catch (error) {
      // Error is handled by the store
    }
  }

  const handleDeleteDepartment = async () => {
    if (!selectedDepartment) return
    
    try {
      await deleteDepartment(selectedDepartment.id)
      setShowDeleteModal(false)
      setSelectedDepartment(null)
    } catch (error) {
      // Error is handled by the store
    }
  }

  const openEditModal = (department) => {
    setSelectedDepartment(department)
    setShowEditModal(true)
  }

  const openDeleteModal = (department) => {
    setSelectedDepartment(department)
    setShowDeleteModal(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-text-dark">Department Management</h2>
          <p className="text-text-light">
            Organize your team into departments for better management
          </p>
        </div>
        
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Department
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricTile
          title="Total Departments"
          value={departments.length}
          variant="blue"
          icon={Building2}
          paddingClassName="p-4"
        />
        <MetricTile
          title="With Managers"
          value={departments.filter((d) => d.manager_id).length}
          variant="green"
          icon={UserCheck}
          paddingClassName="p-4"
        />
        <MetricTile
          title="Without Managers"
          value={departments.filter((d) => !d.manager_id).length}
          variant="orange"
          icon={AlertCircle}
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
              placeholder="Search departments..."
              className="w-full pl-10 pr-4 py-2 border border-background-dark rounded-lg focus:ring-2 focus:ring-primary-default focus:border-primary-default"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Manager Filter */}
          <select
            className="px-3 py-2 border border-background-dark rounded-lg focus:ring-2 focus:ring-primary-default focus:border-primary-default"
            value={filterManager}
            onChange={(e) => setFilterManager(e.target.value)}
          >
            <option value="all">All Departments</option>
            <option value="assigned">With Managers</option>
            <option value="unassigned">Without Managers</option>
          </select>
        </div>
      </Card>

      {/* Department List */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-background-dark">
                <th className="text-left py-3 px-4 font-medium text-text-dark">Department</th>
                <th className="text-left py-3 px-4 font-medium text-text-dark">Manager</th>
                <th className="text-left py-3 px-4 font-medium text-text-dark">Employees</th>
                <th className="text-left py-3 px-4 font-medium text-text-dark">Created</th>
                <th className="text-right py-3 px-4 font-medium text-text-dark">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-8">
                    <LoadingSpinner />
                  </td>
                </tr>
              ) : filteredDepartments.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-text-light">
                    No departments found matching your criteria
                  </td>
                </tr>
              ) : (
                filteredDepartments.map((department) => (
                  <DepartmentRow 
                    key={department.id} 
                    department={department}
                    onEdit={openEditModal}
                    onDelete={openDeleteModal}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Department Modal */}
      <CreateDepartmentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateDepartment}
        loading={loading}
        employees={employees}
      />

      {/* Edit Department Modal */}
      <EditDepartmentModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedDepartment(null)
        }}
        department={selectedDepartment}
        onSubmit={handleUpdateDepartment}
        loading={loading}
        employees={employees}
      />

      {/* Delete Department Modal */}
      <DeleteDepartmentModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setSelectedDepartment(null)
        }}
        department={selectedDepartment}
        onConfirm={handleDeleteDepartment}
        loading={loading}
      />
    </div>
  )
}

// Department Row Component
function DepartmentRow({ department, onEdit, onDelete }) {
  const [showActions, setShowActions] = useState(false)

  return (
    <tr className="border-b border-background-light hover:bg-background-light">
      <td className="py-3 px-4">
        <div>
          <p className="font-medium text-text-dark">{department.name}</p>
          {department.description && (
            <p className="text-sm text-text-light">{department.description}</p>
          )}
        </div>
      </td>
      
      <td className="py-3 px-4">
        {department.manager ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary-light rounded-full flex items-center justify-center">
              <span className="text-primary-default text-xs font-medium">
                {department.manager.full_name?.[0] || department.manager.email?.[0] || 'M'}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-text-dark">
                {department.manager.full_name || 'Unknown'}
              </p>
              <p className="text-xs text-text-light">{department.manager.email}</p>
            </div>
          </div>
        ) : (
          <span className="text-text-muted text-sm">No manager assigned</span>
        )}
      </td>
      
      <td className="py-3 px-4">
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4 text-text-medium" />
          <span className="text-text-dark">0</span>
          <span className="text-text-light text-sm">employees</span>
        </div>
      </td>
      
      <td className="py-3 px-4 text-text-light">
        {new Date(department.created_at).toLocaleDateString()}
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
              <button
                onClick={() => {
                  onEdit(department)
                  setShowActions(false)
                }}
                className="w-full text-left px-4 py-2 hover:bg-background-light flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit Department
              </button>
              <button
                onClick={() => {
                  onDelete(department)
                  setShowActions(false)
                }}
                className="w-full text-left px-4 py-2 hover:bg-background-light text-error-default flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Department
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

// Create Department Modal Component
function CreateDepartmentModal({ isOpen, onClose, onSubmit, loading, employees }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    manager_id: ''
  })
  const [errors, setErrors] = useState({})

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Basic validation
    const newErrors = {}
    if (!formData.name.trim()) newErrors.name = 'Department name is required'
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      // Ensure manager_id is a valid UUID or null
      let managerId = formData.manager_id || null
      if (managerId && !managerId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        // If manager_id is not a valid UUID, find the employee by display name
        const selectedEmployee = employees.find(emp => {
          const displayName = emp.full_name || 
            `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 
            emp.email || 'Unknown User'
          const roleDisplay = emp.role?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
          return `${displayName} - ${roleDisplay}` === managerId
        })
        managerId = selectedEmployee?.id || null
      }
      
      await onSubmit({
        ...formData,
        manager_id: managerId
      })
      setFormData({ name: '', description: '', manager_id: '' })
      setErrors({})
    } catch (error) {
      setErrors({ submit: error.message })
    }
  }

  const handleClose = () => {
    setFormData({ name: '', description: '', manager_id: '' })
    setErrors({})
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Department">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-dark mb-2">
            Department Name *
          </label>
          <input
            type="text"
            required
            className="w-full p-3 border border-background-dark rounded-lg focus:ring-2 focus:ring-primary-default focus:border-primary-default"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Engineering, Marketing, Sales"
          />
          {errors.name && (
            <p className="text-error-default text-sm mt-1">{errors.name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-dark mb-2">
            Description
          </label>
          <textarea
            className="w-full p-3 border border-background-dark rounded-lg focus:ring-2 focus:ring-primary-default focus:border-primary-default"
            rows="3"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of the department's purpose..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-dark mb-2">
            Department Manager
          </label>
          <select
            className="w-full p-3 border border-background-dark rounded-lg focus:ring-2 focus:ring-primary-default focus:border-primary-default"
            value={formData.manager_id}
            onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
          >
            <option value="">Select a manager (optional)</option>
            {employees.filter(emp => emp.status === 'active').map(emp => {
              const displayName = emp.full_name || 
                `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 
                emp.email || 'Unknown User'
              const roleDisplay = emp.role?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
              return (
                <option key={emp.id} value={emp.id}>
                  {displayName} - {roleDisplay}
                </option>
              )
            })}
          </select>
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
            {loading ? 'Creating...' : 'Create Department'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// Edit Department Modal Component
function EditDepartmentModal({ isOpen, onClose, department, onSubmit, loading, employees }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    manager_id: ''
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (department) {
      setFormData({
        name: department.name || '',
        description: department.description || '',
        manager_id: department.manager_id || ''
      })
    }
  }, [department])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Basic validation
    const newErrors = {}
    if (!formData.name.trim()) newErrors.name = 'Department name is required'
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      // Ensure manager_id is a valid UUID or null
      let managerId = formData.manager_id || null
      if (managerId && !managerId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        // If manager_id is not a valid UUID, find the employee by display name
        const selectedEmployee = employees.find(emp => {
          const displayName = emp.full_name || 
            `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 
            emp.email || 'Unknown User'
          const roleDisplay = emp.role?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
          return `${displayName} - ${roleDisplay}` === managerId
        })
        managerId = selectedEmployee?.id || null
      }
      
      await onSubmit(department.id, {
        ...formData,
        manager_id: managerId
      })
      setErrors({})
    } catch (error) {
      setErrors({ submit: error.message })
    }
  }

  const handleClose = () => {
    setFormData({ name: '', description: '', manager_id: '' })
    setErrors({})
    onClose()
  }

  if (!department) return null
  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit Department">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-dark mb-2">
            Department Name *
          </label>
          <input
            type="text"
            required
            className="w-full p-3 border border-background-dark rounded-lg focus:ring-2 focus:ring-primary-default focus:border-primary-default"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Engineering, Marketing, Sales"
          />
          {errors.name && (
            <p className="text-error-default text-sm mt-1">{errors.name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-dark mb-2">
            Description
          </label>
          <textarea
            className="w-full p-3 border border-background-dark rounded-lg focus:ring-2 focus:ring-primary-default focus:border-primary-default"
            rows="3"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of the department's purpose..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-dark mb-2">
            Department Manager
          </label>
          <select
            className="w-full p-3 border border-background-dark rounded-lg focus:ring-2 focus:ring-primary-default focus:border-primary-default"
            value={formData.manager_id}
            onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
          >
            <option value="">Select a manager (optional)</option>
            {employees.filter(emp => emp.status === 'active').map(emp => {
             
              const displayName = emp.full_name || 
                `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 
                emp.email || 'Unknown User'
              const roleDisplay = emp.role?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
              return (
                <option key={emp.id} value={emp.id}>
                  {displayName} - {roleDisplay}
                </option>
              )
            })}
          </select>
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
            {loading ? 'Updating...' : 'Update Department'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// Delete Department Modal Component
function DeleteDepartmentModal({ isOpen, onClose, department, onConfirm, loading }) {
  if (!department) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Department">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-error-light border border-error-default rounded-lg">
          <AlertCircle className="w-6 h-6 text-error-default flex-shrink-0" />
          <div>
            <p className="font-medium text-error-default">Are you sure you want to delete this department?</p>
            <p className="text-sm text-text-light mt-1">
              This action cannot be undone. All employees in this department will need to be reassigned.
            </p>
          </div>
        </div>

        <div className="p-4 bg-background-light rounded-lg">
          <h4 className="font-medium text-text-dark">{department.name}</h4>
          {department.description && (
            <p className="text-sm text-text-light mt-1">{department.description}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete Department'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

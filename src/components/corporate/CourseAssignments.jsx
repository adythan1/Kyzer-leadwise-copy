// src/components/corporate/CourseAssignments.jsx
import { useState, useEffect } from 'react'
import { 
  BookOpen, 
  Plus, 
  Calendar,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  Download,
  Eye,
  Trash2,
  Edit
} from 'lucide-react'
import { useCorporateStore, useCurrentCompany } from '@/store/corporateStore'
import { useCourseStore } from '@/store/courseStore'
import { useAuth } from '@/hooks/auth/useAuth'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import MetricTile from '@/components/ui/MetricTile'
import Modal from '@/components/ui/Modal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function CourseAssignments() {
  const { user } = useAuth()
  const currentCompany = useCurrentCompany()
  const { 
    courseAssignments,
    employees,
    fetchCourseAssignments,
    assignCourseToCompany,
    loading,
    error 
  } = useCorporateStore()
  
  // Store selectors - individual to prevent infinite loops
  const courses = useCourseStore(state => state.courses);
  const fetchCourses = useCourseStore(state => state.actions.fetchCourses);
  
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedAssignment, setSelectedAssignment] = useState(null)

  useEffect(() => {
    fetchCourseAssignments()
    if (user?.id) {
      fetchCourses({}, user.id)
    } else {
      fetchCourses()
    }
  }, [fetchCourseAssignments, fetchCourses, user?.id])

  // Calculate assignment statistics
  const getAssignmentStats = () => {
    const stats = {
      totalAssignments: courseAssignments.length,
      mandatoryAssignments: courseAssignments.filter(a => a.is_mandatory).length,
      overdueAssignments: courseAssignments.filter(a => 
        a.due_date && new Date(a.due_date) < new Date()
      ).length,
      completedAssignments: 0 // This would require enrollment data
    }
    return stats
  }

  const stats = getAssignmentStats()

  const filteredAssignments = courseAssignments.filter(assignment => {
    const matchesSearch = assignment.courses?.title?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'mandatory' && assignment.is_mandatory) ||
      (filterStatus === 'optional' && !assignment.is_mandatory) ||
      (filterStatus === 'overdue' && assignment.due_date && new Date(assignment.due_date) < new Date())
    
    return matchesSearch && matchesFilter
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-text-dark">Course Assignments</h2>
          <p className="text-text-light">
            Manage course assignments for your team
          </p>
        </div>
        
        <Button onClick={() => setShowAssignModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Assign Course
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricTile
          title="Total Assignments"
          value={stats.totalAssignments}
          variant="blue"
          icon={BookOpen}
          paddingClassName="p-4"
        />
        <MetricTile
          title="Mandatory"
          value={stats.mandatoryAssignments}
          variant="error"
          icon={AlertCircle}
          paddingClassName="p-4"
        />
        <MetricTile
          title="Overdue"
          value={stats.overdueAssignments}
          variant="orange"
          icon={Clock}
          paddingClassName="p-4"
        />
        <MetricTile
          title="Completed"
          value={stats.completedAssignments}
          variant="green"
          icon={CheckCircle}
          paddingClassName="p-4"
        />
      </div>

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search course assignments..."
              className="w-full pl-10 pr-4 py-2 border border-background-dark rounded-lg focus:ring-2 focus:ring-primary-default focus:border-primary-default"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="px-3 py-2 border border-background-dark rounded-lg focus:ring-2 focus:ring-primary-default focus:border-primary-default"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Assignments</option>
            <option value="mandatory">Mandatory</option>
            <option value="optional">Optional</option>
            <option value="overdue">Overdue</option>
          </select>

          <Button variant="secondary">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </Card>

      {/* Assignments List */}
      <Card>
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-dark mb-2">No course assignments</h3>
            <p className="text-text-light mb-4">Start by assigning courses to your team</p>
            <Button onClick={() => setShowAssignModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Assign First Course
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-background-dark">
            {filteredAssignments.map((assignment) => (
              <AssignmentRow
                key={assignment.id}
                assignment={assignment}
                employees={employees}
                onViewDetails={setSelectedAssignment}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Assign Course Modal */}
      <AssignCourseModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        courses={courses}
        onAssign={assignCourseToCompany}
        loading={loading}
      />

      {/* Assignment Details Modal */}
      {selectedAssignment && (
        <AssignmentDetailsModal
          assignment={selectedAssignment}
          employees={employees}
          onClose={() => setSelectedAssignment(null)}
        />
      )}
    </div>
  )
}

// Assignment Row Component
function AssignmentRow({ assignment, employees, onViewDetails }) {
  const isOverdue = assignment.due_date && new Date(assignment.due_date) < new Date()
  const daysUntilDue = assignment.due_date 
    ? Math.ceil((new Date(assignment.due_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="p-6 hover:bg-background-light transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-text-dark">
              {assignment.courses?.title || 'Unknown Course'}
            </h3>
            
            {assignment.is_mandatory && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-error-light text-error-default">
                Mandatory
              </span>
            )}
            
            {isOverdue && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning-light text-warning-default">
                Overdue
              </span>
            )}
          </div>
          
          <p className="text-text-light mb-3">{assignment.courses?.description}</p>
          
          <div className="flex items-center gap-6 text-sm text-text-light">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{employees.length} employees assigned</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>
                Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}
              </span>
            </div>
            
            {assignment.due_date && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className={isOverdue ? 'text-error-default' : ''}>
                  Due: {new Date(assignment.due_date).toLocaleDateString()}
                  {daysUntilDue !== null && (
                    <span className="ml-1">
                      ({daysUntilDue > 0 ? `${daysUntilDue} days left` : 'Overdue'})
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewDetails(assignment)}
          >
            <Eye className="w-4 h-4 mr-1" />
            View Details
          </Button>
          
          <Button variant="ghost" size="sm">
            <Edit className="w-4 h-4" />
          </Button>
          
          <Button variant="ghost" size="sm" className="text-error-default hover:text-error-default">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex justify-between text-sm text-text-light mb-2">
          <span>Progress</span>
          <span>45% completed</span> {/* This would be calculated from actual enrollment data */}
        </div>
        <div className="w-full bg-background-medium rounded-full h-2">
          <div className="bg-success-default h-2 rounded-full" style={{ width: '45%' }}></div>
        </div>
      </div>
    </div>
  )
}

// Assign Course Modal Component
function AssignCourseModal({ isOpen, onClose, courses, onAssign, loading }) {
  const [formData, setFormData] = useState({
    courseId: '',
    dueDate: '',
    isMandatory: false
  })
  const [errors, setErrors] = useState({})

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const newErrors = {}
    if (!formData.courseId) newErrors.courseId = 'Please select a course'
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      await onAssign(formData.courseId, {
        dueDate: formData.dueDate || null,
        isMandatory: formData.isMandatory
      })
      
      setFormData({ courseId: '', dueDate: '', isMandatory: false })
      setErrors({})
      onClose()
    } catch (error) {
      setErrors({ submit: error.message })
    }
  }

  const handleClose = () => {
    setFormData({ courseId: '', dueDate: '', isMandatory: false })
    setErrors({})
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Assign Course to Company">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-dark mb-2">
            Select Course *
          </label>
          <select
            required
            className="w-full p-3 border border-background-dark rounded-lg focus:ring-2 focus:ring-primary-default focus:border-primary-default"
            value={formData.courseId}
            onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
          >
            <option value="">Choose a course...</option>
            {courses?.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
          {errors.courseId && (
            <p className="text-error-default text-sm mt-1">{errors.courseId}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-dark mb-2">
            Due Date (Optional)
          </label>
          <input
            type="date"
            className="w-full p-3 border border-background-dark rounded-lg focus:ring-2 focus:ring-primary-default focus:border-primary-default"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="mandatory"
            className="w-4 h-4 text-primary-default border-background-dark rounded focus:ring-primary-default"
            checked={formData.isMandatory}
            onChange={(e) => setFormData({ ...formData, isMandatory: e.target.checked })}
          />
          <label htmlFor="mandatory" className="text-sm text-text-dark">
            This is a mandatory course
          </label>
        </div>

        <div className="p-3 bg-background-light rounded-lg">
          <p className="text-sm text-text-medium">
            This course will be assigned to all current and future employees in your company.
          </p>
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
            {loading ? 'Assigning...' : 'Assign Course'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// Assignment Details Modal Component
function AssignmentDetailsModal({ assignment, employees, onClose }) {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <Modal isOpen={true} onClose={onClose} title={assignment.courses?.title} size="lg">
      <div className="space-y-6">
        {/* Assignment Info */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-background-light rounded-lg">
          <div>
            <p className="text-sm text-text-light">Assigned Date</p>
            <p className="font-medium">{new Date(assignment.assigned_at).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-text-light">Due Date</p>
            <p className="font-medium">
              {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'No due date'}
            </p>
          </div>
          <div>
            <p className="text-sm text-text-light">Type</p>
            <p className="font-medium">
              {assignment.is_mandatory ? 'Mandatory' : 'Optional'}
            </p>
          </div>
          <div>
            <p className="text-sm text-text-light">Assigned By</p>
            <p className="font-medium">{assignment.assigned_by_user?.email || 'Unknown'}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-background-dark">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'progress', label: 'Progress' },
              { id: 'employees', label: 'Employees' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-default text-primary-default'
                    : 'border-transparent text-text-light hover:text-text-medium'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div>
            <h3 className="font-semibold text-text-dark mb-3">Course Description</h3>
            <p className="text-text-medium mb-4">{assignment.courses?.description}</p>
            
            <h3 className="font-semibold text-text-dark mb-3">Assignment Details</h3>
            <ul className="space-y-2 text-sm text-text-medium">
              <li>• All company employees are automatically enrolled</li>
              <li>• Progress is tracked and reported to administrators</li>
              <li>• Certificates are generated upon completion</li>
              {assignment.is_mandatory && <li>• This course is mandatory for all employees</li>}
            </ul>
          </div>
        )}

        {activeTab === 'progress' && (
          <div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <MetricTile
                layout="stack"
                title="Completed"
                value={12}
                variant="green"
                icon={CheckCircle}
                paddingClassName="p-4"
              />
              <MetricTile
                layout="stack"
                title="In Progress"
                value={8}
                variant="orange"
                icon={Clock}
                paddingClassName="p-4"
              />
              <MetricTile
                layout="stack"
                title="Not Started"
                value={5}
                variant="slate"
                icon={Users}
                paddingClassName="p-4"
              />
            </div>
            
            <div className="space-y-3">
              <h3 className="font-semibold text-text-dark">Completion Timeline</h3>
              <div className="h-32 bg-background-light rounded-lg flex items-center justify-center">
                <p className="text-text-muted">Progress chart would go here</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'employees' && (
          <div>
            <div className="space-y-3">
              {employees.slice(0, 10).map((employee) => (
                <div key={employee.id} className="flex items-center justify-between p-3 border border-background-dark rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-light rounded-full flex items-center justify-center">
                      {employee.avatar_url ? (
                        <img 
                          src={employee.avatar_url} 
                          alt={employee.full_name || employee.first_name || 'User'}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-primary-default font-medium text-sm">
                          {(employee.first_name?.[0] || employee.email?.[0] || 'U').toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-text-dark">
                        {employee.full_name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Unknown User'}
                      </p>
                      <p className="text-sm text-text-light">{employee.email || 'No email'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-success-default">Completed</p>
                    <p className="text-xs text-text-light">2 days ago</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  )
}
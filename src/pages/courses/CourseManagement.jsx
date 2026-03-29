// src/pages/courses/CourseManagement.jsx
import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { useCourseStore } from '@/store/courseStore';
import { useAuth } from '@/hooks/auth/useAuth';
import { PERMISSIONS } from '@/constants/permissions';
import { hasPermission, canManageThisCourse } from '@/utils/permissions';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  BookOpen,
  Settings,
  Users,
  Clock,
  FolderOpen,
  Search,
  Filter,
  Paperclip,
  Gift,
  LayoutGrid,
  List,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PageTitle from '@/components/layout/PageTitle';
import CourseForm from '@/components/course/CourseForm';
import LessonForm from '@/components/course/LessonForm';
import ModuleForm from '@/components/course/ModuleForm';
import QuizForm from '@/components/course/QuizForm';
import ResourcesQuickEditModal from '@/components/course/ResourcesQuickEditModal';
import { useToast } from '@/components/ui';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import CourseStructurePanel from '@/components/course/CourseStructurePanel';

export default function CourseManagement() {
  const { user } = useAuth();
  const { success, error: showError, warning } = useToast();
  
  // Store selectors - individual to prevent infinite loops
  const courses = useCourseStore(state => state.courses);
  const loading = useCourseStore(state => state.loading);
  const error = useCourseStore(state => state.error);
  
  const fetchCourses = useCourseStore(state => state.actions.fetchCourses);
  const deleteCourse = useCourseStore(state => state.actions.deleteCourse);
  const toggleCoursePublish = useCourseStore(state => state.actions.toggleCoursePublish);
  const fetchCourseLessons = useCourseStore(state => state.actions.fetchCourseLessons);
  const fetchCourseModules = useCourseStore(state => state.actions.fetchCourseModules);
  const getCourseCounts = useCourseStore(state => state.actions.getCourseCounts);
  const createModule = useCourseStore(state => state.actions.createModule);
  const updateModule = useCourseStore(state => state.actions.updateModule);
  const deleteModule = useCourseStore(state => state.actions.deleteModule);
  const fetchQuizzes = useCourseStore(state => state.actions.fetchQuizzes);
  const deleteQuiz = useCourseStore(state => state.actions.deleteQuiz);

  const updateCourse = useCourseStore(state => state.actions.updateCourse);

  const [showCourseForm, setShowCourseForm] = useState(false);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [showResourcesModal, setShowResourcesModal] = useState(false);
  const [showFreeTrialManager, setShowFreeTrialManager] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editingLesson, setEditingLesson] = useState(null);
  const [editingModule, setEditingModule] = useState(null);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [resourcesCourse, setResourcesCourse] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [courseLessons, setCourseLessons] = useState({});
  const [courseModules, setCourseModules] = useState({});
  const [courseQuizzes, setCourseQuizzes] = useState({});
  const [expandedModules, setExpandedModules] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [coursesViewMode, setCoursesViewMode] = useState(() => {
    try {
      const stored = localStorage.getItem('courseManagementView');
      if (stored === 'gallery' || stored === 'list') return stored;
    } catch {
      /* ignore */
    }
    return 'list';
  });

  const setCoursesViewModePersisted = useCallback((mode) => {
    setCoursesViewMode(mode);
    try {
      localStorage.setItem('courseManagementView', mode);
    } catch {
      /* ignore */
    }
  }, []);
  const [structurePanelCourseId, setStructurePanelCourseId] = useState(null);
  const [structurePanelLoading, setStructurePanelLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, courseId: null, courseTitle: '' });
  const [confirmDeleteModule, setConfirmDeleteModule] = useState({ open: false, moduleId: null, courseId: null, moduleTitle: '' });
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState({ open: false, courseId: null, courseTitle: '', isPublishing: false });
  const [isTogglingPublish, setIsTogglingPublish] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchCourses({}, user.id);
    } else {
      fetchCourses();
    }
  }, [fetchCourses, user?.id]);

  // Load counts when courses change
  useEffect(() => {
    const loadCounts = async () => {
      const updates = {};
      for (const c of courses) {
        const result = await getCourseCounts(c.id);
        updates[c.id] = result.data || { modules: 0, lessons: 0 };
      }
      setCourseModules(prev => {
        const merged = { ...prev };
        Object.keys(updates).forEach(id => {
          // keep arrays for expanded view; counts will be read from countsMap
          if (!merged[id]) merged[id] = [];
        });
        return merged;
      });
      setCountsMap(updates);
    };
    if (courses && courses.length > 0) {
      loadCounts();
    }
  }, [courses, getCourseCounts]);

  const [countsMap, setCountsMap] = useState({});

  const handleCourseSuccess = async (courseData) => {
    // Add a small delay to ensure success toast is visible before closing modal
    setTimeout(async () => {
      setShowCourseForm(false);
      setEditingCourse(null);
      // Refresh courses list after creation/update
      await fetchCourses();
    }, 1500);
  };

  const handleLessonSuccess = (lessonData) => {
    setShowLessonForm(false);
    setEditingLesson(null);
    if (selectedCourseId) {
      loadCourseLessons(selectedCourseId);
    }
  };

  const handleModuleSuccess = async (moduleData) => {
    // Toast is already shown in ModuleForm, so we just refresh the data
    if (selectedCourseId) {
      await loadCourseModules(selectedCourseId);
      await loadCourseLessons(selectedCourseId);
    }
    // Close modal after a brief delay to ensure toast is visible
    setTimeout(() => {
      setShowModuleForm(false);
      setEditingModule(null);
    }, 500);
  };

  const handleQuizSuccess = () => {
    setShowQuizForm(false);
    setEditingQuiz(null);
    if (selectedCourseId) {
      loadCourseQuizzes(selectedCourseId);
    }
  };

  const handleEditCourse = (course) => {
    setEditingCourse(course);
    setShowCourseForm(true);
  };

  const handleDeleteCourse = (courseId) => {
    if (!courseId) {
      showError('Invalid course ID');
      return;
    }
    
    const course = courses.find(c => c.id === courseId);
    if (!course) {
      showError('Course not found');
      return;
    }
    
    // Open confirmation dialog
    setConfirmDelete({ 
      open: true, 
      courseId, 
      courseTitle: course.title || 'this course' 
    });
  };

  const confirmDeleteCourse = async () => {
    const { courseId } = confirmDelete;
    if (!courseId) {
      showError('No course selected for deletion');
      return;
    }
    
    setIsDeletingCourse(true);
    
    try {
      const result = await deleteCourse(courseId);
      if (result.success) {
        success('Course deleted successfully!');
        setStructurePanelCourseId((prev) => (prev === courseId ? null : prev));
        // Refresh courses list after deletion
        await fetchCourses();
        setConfirmDelete({ open: false, courseId: null, courseTitle: '' });
      } else {
        const errorMessage = result.error || 'Failed to delete course';
        showError(errorMessage);
        // Keep dialog open on error so user can see the error message
      }
    } catch (error) {
      const errorMessage = error.message || 'An unexpected error occurred while deleting the course';
      showError(errorMessage);
      // Keep dialog open on error so user can see the error message
    } finally {
      setIsDeletingCourse(false);
    }
  };

  const handleTogglePublish = (courseId, currentStatus) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) {
      showError('Course not found');
      return;
    }
    
    const isPublished = currentStatus === 'published';
    
    // Show confirmation dialog
    setConfirmPublish({
      open: true,
      courseId,
      courseTitle: course.title || 'this course',
      isPublishing: !isPublished
    });
  };

  const confirmTogglePublish = async () => {
    const { courseId, isPublishing } = confirmPublish;
    if (!courseId) {
      showError('No course selected');
      return;
    }
    
    setIsTogglingPublish(true);
    
    try {
      const result = await toggleCoursePublish(courseId, isPublishing);
      
      if (result.data) {
        const message = isPublishing 
          ? `Course "${confirmPublish.courseTitle}" published successfully!` 
          : `Course "${confirmPublish.courseTitle}" unpublished successfully!`;
        success(message);
        
        // Refresh courses list after a brief delay to ensure toast is visible
        setTimeout(async () => {
          await fetchCourses();
        }, 500);
        
        setConfirmPublish({ open: false, courseId: null, courseTitle: '', isPublishing: false });
      } else {
        const errorMsg = result.error || 'Failed to update course status';
        showError(errorMsg);
        // Keep dialog open on error so user can see the error message
      }
    } catch (error) {
      const errorMsg = error.message || 'An unexpected error occurred while updating course status';
      showError(errorMsg);
      // Keep dialog open on error so user can see the error message
    } finally {
      setIsTogglingPublish(false);
    }
  };

  const handleAddLesson = (courseId) => {
    setSelectedCourseId(courseId);
    setShowLessonForm(true);
  };

  const handleEditLesson = (lesson, courseId) => {
    setEditingLesson(lesson);
    setSelectedCourseId(courseId);
    setShowLessonForm(true);
  };

  
  const handleAddQuizForLesson = (lesson, courseId) => {
    setEditingQuiz({ lesson_id: lesson.id });
    setSelectedCourseId(courseId);
    setShowQuizForm(true);
  };

  const handleAddQuiz = (courseId) => {
    setSelectedCourseId(courseId);
    setShowQuizForm(true);
  };

  const handleManageResources = (course) => {
    setResourcesCourse(course);
    setShowResourcesModal(true);
  };

  const handleResourcesModalClose = async () => {
    setShowResourcesModal(false);
    setResourcesCourse(null);
    // Refresh courses to show updated resources
    await fetchCourses();
  };

  const handleEditQuiz = (quiz, courseId) => {
    setEditingQuiz(quiz);
    setSelectedCourseId(courseId);
    setShowQuizForm(true);
  };

  const handleManagePresentation = (lesson, courseId) => {
    // Navigate to presentation management page
    window.location.href = `/app/courses/${courseId}/lesson/${lesson.id}/presentation`;
  };

  const handleDeleteQuiz = async (quiz, courseId) => {
    const res = await deleteQuiz(quiz.id);
    if (res.success) {
      success('Quiz deleted successfully!');
      loadCourseQuizzes(courseId);
    } else {
      showError(res.error || 'Failed to delete quiz');
    }
  };

  const [confirmDeleteLesson, setConfirmDeleteLesson] = useState({ open: false, lessonId: null, courseId: null, lessonTitle: '' });
  const deleteLesson = useCourseStore(state => state.actions.deleteLesson);
  const handleDeleteLesson = (lesson, courseId) => {
    setConfirmDeleteLesson({ open: true, lessonId: lesson.id, courseId, lessonTitle: lesson.title || '' });
  };
  const confirmDeleteLessonAction = async () => {
    const { lessonId, courseId } = confirmDeleteLesson;
    if (!lessonId || !courseId) return;
    const result = await deleteLesson(lessonId);
    if (result?.success !== false) {
      success('Lesson deleted successfully!');
      loadCourseLessons(courseId);
    } else {
      showError(result.error || 'Failed to delete lesson');
    }
    setConfirmDeleteLesson({ open: false, lessonId: null, courseId: null, lessonTitle: '' });
  };

  const handleAddModule = (courseId) => {
    setSelectedCourseId(courseId);
    setShowModuleForm(true);
  };

  const handleEditModule = (module, courseId) => {
    setEditingModule(module);
    setSelectedCourseId(courseId);
    setShowModuleForm(true);
  };

  const handleDeleteModule = async (moduleId, courseId, moduleTitle = '') => {
    setConfirmDeleteModule({ open: true, moduleId, courseId, moduleTitle });
  };

  const confirmDeleteModuleAction = async () => {
    const { moduleId, courseId } = confirmDeleteModule;
    if (!moduleId || !courseId) return;
    const result = await deleteModule(moduleId, courseId);
    if (result.success) {
      success('Module deleted successfully!');
      loadCourseModules(courseId);
      loadCourseLessons(courseId);
    } else {
      showError(result.error || 'Failed to delete module');
    }
    setConfirmDeleteModule({ open: false, moduleId: null, courseId: null, moduleTitle: '' });
  };

  const toggleModuleExpansion = (moduleId) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const loadCourseLessons = async (courseId) => {
    const result = await fetchCourseLessons(courseId);
    if (result.data) {
      // Convert grouped lessons to flat array for display
      const flatLessons = [];
      Object.values(result.data).forEach(moduleData => {
        if (moduleData.lessons && Array.isArray(moduleData.lessons)) {
          flatLessons.push(...moduleData.lessons);
        }
      });
      
      // Sort lessons by their order_index
      flatLessons.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      
      setCourseLessons(prev => ({
        ...prev,
        [courseId]: flatLessons
      }));
    }
  };

  const loadCourseModules = async (courseId) => {
    const result = await fetchCourseModules(courseId);
    if (result.data) {
      setCourseModules(prev => ({
        ...prev,
        [courseId]: result.data
      }));
    }
  };

  const loadCourseQuizzes = async (courseId) => {
    const result = await fetchQuizzes(courseId);
    if (result.data) {
      setCourseQuizzes(prev => ({
        ...prev,
        [courseId]: result.data
      }));
    }
  };

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesSearch =
        course.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter =
        filterStatus === 'all' ||
        (filterStatus === 'published' && course.is_published) ||
        (filterStatus === 'draft' && !course.is_published) ||
        (filterStatus === 'free_trial' && course.is_free_trial);
      return matchesSearch && matchesFilter;
    });
  }, [courses, searchTerm, filterStatus]);

  const closeCourseStructurePanel = useCallback(() => {
    setStructurePanelCourseId(null);
  }, []);

  const toggleCourseStructurePanel = useCallback(
    async (courseId) => {
      if (structurePanelCourseId === courseId) {
        closeCourseStructurePanel();
        return;
      }
      setStructurePanelCourseId(courseId);
      setStructurePanelLoading(true);
      try {
        await Promise.all([
          loadCourseLessons(courseId),
          loadCourseModules(courseId),
          loadCourseQuizzes(courseId),
        ]);
      } finally {
        setStructurePanelLoading(false);
      }
    },
    [
      structurePanelCourseId,
      closeCourseStructurePanel,
      loadCourseLessons,
      loadCourseModules,
      loadCourseQuizzes,
    ],
  );

  if (loading.courses) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
      }
    return (
    <div className="py-1">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <PageTitle
            title="Course Management"
            subtitle="Create and manage your courses"
          />
          <div className="flex flex-wrap gap-3">
            <Link to="/app/courses/categories">
              <Button variant="secondary">
                <Settings className="w-4 h-4 mr-2" />
                Manage Categories
              </Button>
            </Link>
            <Button onClick={() => setShowCourseForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Course
            </Button>
          </div>
        </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Courses</p>
              <p className="text-2xl font-bold text-gray-900">{courses?.length || 0}</p>
            </div>
            <BookOpen className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Published</p>
              <p className="text-2xl font-bold text-green-600">
                {courses?.filter(c => c.is_published).length || 0}
              </p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <Eye className="w-4 h-4 text-green-500" />
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Draft</p>
              <p className="text-2xl font-bold text-orange-600">
                {courses?.filter(c => !c.is_published).length || 0}
              </p>
            </div>
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
              <EyeOff className="w-4 h-4 text-orange-500" />
            </div>
          </div>
        </Card>
        
        <Card
          className="p-4 cursor-pointer hover:ring-2 hover:ring-emerald-300 transition-all"
          onClick={() => setShowFreeTrialManager(!showFreeTrialManager)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Free Trial Package</p>
              <p className="text-2xl font-bold text-emerald-600">
                {courses?.filter(c => c.is_free_trial).length || 0}
                <span className="text-sm font-normal text-gray-400"> / 5</span>
              </p>
            </div>
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
              <Gift className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Free Trial Package Manager */}
      {showFreeTrialManager && (
        <Card className="p-6 border-2 border-emerald-200 bg-emerald-50/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Gift className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Free Trial Package</h3>
                <p className="text-sm text-gray-600">
                  Select up to 5 short courses for free trial users. These courses will not include assessments or certificates.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowFreeTrialManager(false)}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              Close
            </button>
          </div>

          <div className="mb-4 flex items-center gap-2">
            <div className="h-2 flex-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  (courses?.filter(c => c.is_free_trial).length || 0) >= 5
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(((courses?.filter(c => c.is_free_trial).length || 0) / 5) * 100, 100)}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
              {courses?.filter(c => c.is_free_trial).length || 0} / 5 courses
            </span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {courses?.filter(c => c.is_published).map(course => {
              const isInFreeTrial = course.is_free_trial;
              const limitReached = (courses?.filter(c => c.is_free_trial).length || 0) >= 5;

              return (
                <div
                  key={course.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    isInFreeTrial
                      ? 'bg-emerald-100 border-emerald-300'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={isInFreeTrial}
                      disabled={!isInFreeTrial && limitReached}
                      onChange={async () => {
                        try {
                          await updateCourse(course.id, { is_free_trial: !isInFreeTrial });
                          await fetchCourses(user?.id);
                          if (!isInFreeTrial) {
                            success(`"${course.title}" added to free trial package`);
                          } else {
                            success(`"${course.title}" removed from free trial package`);
                          }
                        } catch (err) {
                          showError('Failed to update free trial status');
                        }
                      }}
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                    />
                    <div className="truncate">
                      <p className="text-sm font-medium text-gray-900 truncate">{course.title}</p>
                      <p className="text-xs text-gray-500">
                        {course.duration_minutes ? `${course.duration_minutes} min` : 'No duration set'}
                        {course.difficulty_level ? ` · ${course.difficulty_level}` : ''}
                      </p>
                    </div>
                  </div>
                  {isInFreeTrial && (
                    <span className="text-xs bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                      Free Trial
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {(!courses || courses.filter(c => c.is_published).length === 0) && (
            <p className="text-sm text-gray-500 text-center py-4">
              No published courses available. Publish courses first to add them to the free trial package.
            </p>
          )}
        </Card>
      )}

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search courses..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="inline-flex rounded-lg border border-gray-300 bg-gray-50 p-0.5"
              role="group"
              aria-label="Course layout"
            >
              <button
                type="button"
                onClick={() => setCoursesViewModePersisted('list')}
                className={`rounded-md p-2 transition-colors ${
                  coursesViewMode === 'list'
                    ? 'bg-white text-primary-default shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                title="List view"
                aria-pressed={coursesViewMode === 'list'}
              >
                <List className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setCoursesViewModePersisted('gallery')}
                className={`rounded-md p-2 transition-colors ${
                  coursesViewMode === 'gallery'
                    ? 'bg-white text-primary-default shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                title="Gallery view"
                aria-pressed={coursesViewMode === 'gallery'}
              >
                <LayoutGrid className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Courses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="free_trial">Free Trial</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Course Form Modal */}
      {showCourseForm && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CourseForm
              course={editingCourse}
              onSuccess={handleCourseSuccess}
              onCancel={() => {
                setShowCourseForm(false);
                setEditingCourse(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Lesson Form Modal */}
      {showLessonForm && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <LessonForm
              lesson={editingLesson}
              courseId={selectedCourseId}
              onSuccess={handleLessonSuccess}
              onCancel={() => {
                setShowLessonForm(false);
                setEditingLesson(null);
                setSelectedCourseId(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Module Form Modal */}
      {showModuleForm && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <ModuleForm
              module={editingModule}
              courseId={selectedCourseId}
              onSuccess={handleModuleSuccess}
              onCancel={() => {
                setShowModuleForm(false);
                setEditingModule(null);
                setSelectedCourseId(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Quiz Form Modal */}
      {showQuizForm && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <QuizForm
              quiz={editingQuiz}
              courseId={selectedCourseId}
              onSuccess={handleQuizSuccess}
              onCancel={() => {
                setShowQuizForm(false);
                setEditingQuiz(null);
                setSelectedCourseId(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Resources Quick Edit Modal */}
      <ResourcesQuickEditModal
        isOpen={showResourcesModal}
        onClose={handleResourcesModalClose}
        course={resourcesCourse}
      />

      {/* Error Display */}
      {error && (
        <Card className="p-4 bg-red-50 border border-red-200">
          <p className="text-red-600">{error}</p>
        </Card>
      )}

      {/* Courses List */}
      <div
        className={
          coursesViewMode === 'gallery'
            ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'
            : 'space-y-4'
        }
      >
        {courses.length === 0 ? (
          <Card className="col-span-full p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No courses yet
            </h3>
            <p className="text-gray-600 mb-4">
              Create your first course to get started
            </p>
            <Button onClick={() => setShowCourseForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Course
            </Button>
          </Card>
        ) : filteredCourses.length === 0 ? (
          <Card className="col-span-full p-12 text-center">
            <Filter className="mx-auto mb-4 h-12 w-12 text-gray-400" aria-hidden />
            <h3 className="mb-2 text-lg font-semibold text-gray-900">No courses match</h3>
            <p className="text-gray-600">Try adjusting your search or filters.</p>
          </Card>
        ) : (
          filteredCourses.map((course) => {
            const canManage = canManageThisCourse(user, course);
            const canPublish = hasPermission(user, PERMISSIONS.PUBLISH_COURSES);
            const canEdit = hasPermission(user, PERMISSIONS.EDIT_COURSES);
            const canDelete = hasPermission(user, PERMISSIONS.DELETE_COURSES);
            const canManageResources = hasPermission(user, PERMISSIONS.MANAGE_RESOURCES);

            const courseActions = (
              <div
                className={
                  coursesViewMode === 'gallery'
                    ? 'mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3'
                    : 'ml-4 flex shrink-0 flex-wrap items-center gap-2'
                }
              >
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => toggleCourseStructurePanel(course.id)}
                >
                  {structurePanelCourseId === course.id ? 'Close structure' : 'Course structure'}
                </Button>
                {canManage && (
                  <>
                    {canPublish && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleTogglePublish(course.id, course.status)}
                        title={course.status === 'published' ? 'Unpublish course' : 'Publish course'}
                      >
                        {course.status === 'published' ? (
                          <>
                            <EyeOff className="mr-1 h-4 w-4" />
                            Unpublish
                          </>
                        ) : (
                          <>
                            <Eye className="mr-1 h-4 w-4" />
                            Publish
                          </>
                        )}
                      </Button>
                    )}
                    {canEdit && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleEditCourse(course)}
                        title="Edit course details"
                      >
                        <Edit className="mr-1 h-4 w-4" />
                        Edit
                      </Button>
                    )}
                    {canManageResources && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleManageResources(course)}
                        title="Manage course resources and attachments"
                      >
                        <Paperclip className="mr-1 h-4 w-4" />
                        Resources
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (course?.id) {
                            handleDeleteCourse(course.id);
                          } else {
                            showError('Unable to delete: Course ID not found');
                          }
                        }}
                        className="text-red-600 hover:text-red-700"
                        title="Delete Course"
                        aria-label="Delete Course"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            );

            return (
            <Fragment key={course.id}>
            <Card
              className={
                coursesViewMode === 'gallery'
                  ? 'flex h-full flex-col p-4'
                  : 'p-6'
              }
            >
              {coursesViewMode === 'gallery' ? (
                <>
                  <div className="mb-3 aspect-video w-full overflow-hidden rounded-lg bg-gray-100">
                    {course.thumbnail_url ? (
                      <img
                        src={course.thumbnail_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-400">
                        <BookOpen className="h-12 w-12" aria-hidden />
                      </div>
                    )}
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col">
                    <h3 className="mb-2 line-clamp-2 text-base font-semibold text-gray-900">
                      {course.title}
                    </h3>
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          course.status === 'published'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {course.status}
                      </span>
                      {course.is_published && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          Published
                        </span>
                      )}
                      {course.is_free_trial && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Free Trial
                        </span>
                      )}
                    </div>
                    {course.description ? (
                      <p className="mb-3 line-clamp-2 text-sm text-gray-600">{course.description}</p>
                    ) : null}
                    <div className="mb-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span>{course.duration_minutes || 0} min</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {countsMap[course.id]?.lessons ?? (courseLessons[course.id]?.length || 0)} lessons
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {countsMap[course.id]?.modules ?? (courseModules[course.id]?.length || 0)} modules
                        </span>
                      </div>
                      {course.category && (
                        <span
                          className="rounded px-2 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor: course.category.color ? `${course.category.color}20` : '#f3f4f6',
                            color: course.category.color || '#374151',
                          }}
                        >
                          {course.category.name}
                        </span>
                      )}
                    </div>
                  </div>
                  {courseActions}
                </>
              ) : (
              <div className="mb-6 flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {course.title}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      course.status === 'published' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {course.status}
                    </span>
                    {course.is_published && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        Published
                      </span>
                    )}
                    {course.is_free_trial && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        Free Trial
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-600 mb-3">{course.description}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{course.duration_minutes || 0} min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      <span>{countsMap[course.id]?.lessons ?? (courseLessons[course.id]?.length || 0)} lessons</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FolderOpen className="w-4 h-4" />
                      <span>{countsMap[course.id]?.modules ?? (courseModules[course.id]?.length || 0)} modules</span>
                    </div>
                    {course.creator && (
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>
                          {course.creator.first_name && course.creator.last_name 
                            ? `${course.creator.first_name} ${course.creator.last_name}`
                            : course.creator.email || 'Unknown Creator'
                          }
                        </span>
                      </div>
                    )}
                    {course.category && (
                      <span 
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{
                          backgroundColor: course.category.color ? `${course.category.color}20` : '#f3f4f6',
                          color: course.category.color || '#374151'
                        }}
                      >
                        {course.category.name}
                      </span>
                    )}
                  </div>
                </div>
                {courseActions}
              </div>
              )}
            </Card>
            {structurePanelCourseId === course.id ? (
              <CourseStructurePanel
                course={course}
                user={user}
                onClose={closeCourseStructurePanel}
                loading={structurePanelLoading}
                modules={courseModules[course.id]}
                lessons={courseLessons[course.id]}
                quizzes={courseQuizzes[course.id]}
                expandedModules={expandedModules}
                onToggleModuleExpansion={toggleModuleExpansion}
                onAddModule={handleAddModule}
                onAddLesson={handleAddLesson}
                onAddQuiz={handleAddQuiz}
                onEditModule={handleEditModule}
                onDeleteModule={handleDeleteModule}
                onEditLesson={handleEditLesson}
                onDeleteLesson={handleDeleteLesson}
                onManagePresentation={handleManagePresentation}
                onAddQuizForLesson={handleAddQuizForLesson}
                onEditQuiz={handleEditQuiz}
                onDeleteQuiz={handleDeleteQuiz}
                className="col-span-full w-full max-w-none"
              />
            ) : null}
            </Fragment>
            );
          })
        )}
      </div>
      {/* Delete confirmation modal */}
      <ConfirmDialog
        isOpen={confirmDelete.open}
        onClose={() => {
          if (!isDeletingCourse) {
            setConfirmDelete({ open: false, courseId: null, courseTitle: '' });
          }
        }}
        onConfirm={confirmDeleteCourse}
        title="Delete Course"
        description={`Are you sure you want to delete "${confirmDelete.courseTitle || 'this course'}"? This action cannot be undone.`}
        confirmText={isDeletingCourse ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        confirmVariant="danger"
      />
      
      {/* Publish/Unpublish confirmation modal */}
      <ConfirmDialog
        isOpen={confirmPublish.open}
        onClose={() => {
          if (!isTogglingPublish) {
            setConfirmPublish({ open: false, courseId: null, courseTitle: '', isPublishing: false });
          }
        }}
        onConfirm={confirmTogglePublish}
        title={confirmPublish.isPublishing ? 'Publish Course' : 'Unpublish Course'}
        description={
          confirmPublish.isPublishing
            ? `Are you sure you want to publish "${confirmPublish.courseTitle}"? It will become visible to students.`
            : `Are you sure you want to unpublish "${confirmPublish.courseTitle}"? It will no longer be visible to students.`
        }
        confirmText={isTogglingPublish ? (confirmPublish.isPublishing ? 'Publishing...' : 'Unpublishing...') : (confirmPublish.isPublishing ? 'Publish' : 'Unpublish')}
        cancelText="Cancel"
        confirmVariant={confirmPublish.isPublishing ? 'primary' : 'warning'}
      />
      
      {/* Delete lesson confirmation modal */}
      <ConfirmDialog
        isOpen={confirmDeleteLesson.open}
        onClose={() => setConfirmDeleteLesson({ open: false, lessonId: null, courseId: null, lessonTitle: '' })}
        onConfirm={confirmDeleteLessonAction}
        title="Delete Lesson"
        description={`Are you sure you want to delete "${confirmDeleteLesson.lessonTitle || 'this lesson'}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
      />
      </div>
    </div>
  );
}

// src/components/course/CourseForm.jsx
import { useState, useEffect, useMemo } from 'react';
import { Paperclip, AlertTriangle } from 'lucide-react';
import { useCourseStore } from '@/store/courseStore';
import { useAuth } from '@/hooks/auth/useAuth';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui';
import ResourcesManager from './ResourcesManager';
import { supabase, TABLES } from '@/lib/supabase';

const FREE_TRIAL_COURSE_LIMIT = 5;

export default function CourseForm({ course = null, onSuccess, onCancel }) {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  
  // Store selectors - individual to prevent infinite loops
  const createCourse = useCourseStore(state => state.actions.createCourse);
  const updateCourse = useCourseStore(state => state.actions.updateCourse);
  const isCourseTitleUnique = useCourseStore(state => state.actions.isCourseTitleUnique);
  const categories = useCourseStore(state => state.categories);
  const loadingCategories = useCourseStore(state => state.loading.categories);
  const fetchCategories = useCourseStore(state => state.actions.fetchCategories);
  const allCourses = useCourseStore(state => state.courses);

  const freeTrialCount = useMemo(() => {
    const count = allCourses?.filter(c => c.is_free_trial).length || 0;
    if (course?.is_free_trial) return count - 1;
    return count;
  }, [allCourses, course?.is_free_trial]);

  const freeTrialLimitReached = freeTrialCount >= FREE_TRIAL_COURSE_LIMIT;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    duration_minutes: '',
    difficulty_level: '',
    prerequisites: '',
    learning_objectives: '',
    thumbnail_url: '',
    slug: '',
    is_public: false,
    is_free_trial: false,
    catalog_visible: true,
    restricted_organization_id: '',
    resources: []
  });

  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEditing] = useState(!!course);

  // Initialize form with course data if editing
  useEffect(() => {
    if (course) {
      setFormData({
        title: course.title || '',
        description: course.description || '',
        category_id: course.category_id || '',
        duration_minutes: course.duration_minutes || '',
        difficulty_level: course.difficulty_level || '',
        prerequisites: Array.isArray(course.prerequisites) ? 
          course.prerequisites.join('\n') : 
          course.prerequisites || '',
        learning_objectives: Array.isArray(course.learning_objectives) ? 
          course.learning_objectives.join('\n') : 
          course.learning_objectives || '',
        thumbnail_url: course.thumbnail_url || '',
        slug: course.slug || '',
        is_public: course.is_public || false,
        is_free_trial: course.is_free_trial || false,
        catalog_visible: course.catalog_visible !== false,
        restricted_organization_id: course.restricted_organization_id || '',
        resources: course.resources || []
      });
    }
  }, [course]);

  // Fetch categories from database
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from(TABLES.ORGANIZATIONS)
        .select('id, name')
        .order('name');
      if (!cancelled) setOrganizations(data || []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleTitleChange = (e) => {
    const title = e.target.value;
    setFormData(prev => ({
      ...prev,
      title,
      slug: generateSlug(title)
    }));
  };

  const validateForm = async () => {
    if (!formData.title.trim()) {
      setError('Course title is required');
      return false;
    }
    if (!formData.description.trim()) {
      setError('Course description is required');
      return false;
    }
    if (!formData.slug.trim()) {
      setError('Course slug is required');
      return false;
    }
    // Uniqueness check
    const unique = await isCourseTitleUnique(formData.title, course?.id || null);
    if (!unique) {
      setError('A course with this title already exists');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!(await validateForm())) return;

    // Show confirmation dialog for course creation
    if (!isEditing) {
      const confirmed = window.confirm(
        `Are you sure you want to create the course "${formData.title}"?`
      );
      if (!confirmed) return;
    }

    setLoading(true);

    try {
      const courseData = {
        ...formData,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        category_id: formData.category_id || null,
        catalog_visible: Boolean(formData.catalog_visible),
        restricted_organization_id: formData.restricted_organization_id?.trim() || null,
        // Convert text fields to arrays if they're expected as arrays by the database
        learning_objectives: formData.learning_objectives ? 
          formData.learning_objectives.split('\n').filter(obj => obj.trim()) : 
          [],
        prerequisites: formData.prerequisites ? 
          formData.prerequisites.split('\n').filter(obj => obj.trim()) : 
          [],
        resources: formData.resources || []
      };

      let result;
      if (isEditing) {
        result = await updateCourse(course.id, courseData);
      } else {
        result = await createCourse(courseData, user.id);
      }

      if (result.error) {
        setError(result.error);
        showError(result.error);
        return;
      }

      const message = isEditing 
        ? `Course "${result.data.title}" updated successfully!` 
        : `Course "${result.data.title}" created successfully!`;
      
      success(message);
      onSuccess?.(result.data);
    } catch (err) {
      const errorMessage = err.message || 'An error occurred';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const difficultyLevels = ['Beginner', 'Intermediate', 'Advanced'];

  return (
    <Card className="max-w-8xl mx-auto">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {isEditing ? 'Edit Course' : 'Create New Course'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course Title *
              </label>
              <Input
                name="title"
                value={formData.title}
                onChange={handleTitleChange}
                placeholder="Enter course title"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe what students will learn in this course"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category (Optional)
              </label>
              {loadingCategories ? (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                  <span className="text-gray-500">Loading categories...</span>
                </div>
              ) : categories.length > 0 ? (
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a category (optional)</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                  <span className="text-gray-500">No categories available</span>
                  <p className="text-xs text-gray-400 mt-1">
                    <a 
                      href="/app/courses/categories" 
                      className="text-blue-600 hover:text-blue-700 underline"
                    >
                      Create categories here
                    </a>
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty Level
              </label>
              <select
                name="difficulty_level"
                value={formData.difficulty_level}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select difficulty</option>
                {difficultyLevels.map(level => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (minutes)
              </label>
              <Input
                name="duration_minutes"
                type="number"
                value={formData.duration_minutes}
                onChange={handleInputChange}
                placeholder="e.g., 120"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course Slug *
              </label>
              <Input
                name="slug"
                value={formData.slug}
                onChange={handleInputChange}
                placeholder="course-slug"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be used in the course URL
              </p>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prerequisites (One per line)
              </label>
              <textarea
                name="prerequisites"
                value={formData.prerequisites}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="What should students know before taking this course?&#10;Enter each prerequisite on a new line"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter each prerequisite on a separate line
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Learning Objectives (One per line)
              </label>
              <textarea
                name="learning_objectives"
                value={formData.learning_objectives}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="What will students be able to do after completing this course?&#10;Enter each objective on a new line"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter each learning objective on a separate line
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Thumbnail URL
              </label>
              <Input
                name="thumbnail_url"
                value={formData.thumbnail_url}
                onChange={handleInputChange}
                placeholder="https://example.com/image.jpg"
                type="url"
              />
            </div>

            <div className="flex items-center">
              <input
                name="is_public"
                type="checkbox"
                checked={formData.is_public}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">
                Make this course publicly visible (even when not published)
              </label>
            </div>

            <div className={`p-3 rounded-lg border ${
              freeTrialLimitReached && !formData.is_free_trial
                ? 'bg-amber-50 border-amber-200'
                : 'bg-green-50 border-green-200'
            }`}>
              <div className="flex items-center">
                <input
                  name="is_free_trial"
                  type="checkbox"
                  checked={formData.is_free_trial}
                  onChange={handleInputChange}
                  disabled={freeTrialLimitReached && !formData.is_free_trial}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <div className="ml-3">
                  <label className="block text-sm font-medium text-green-800">
                    Include in Free Trial Package
                  </label>
                  <p className="text-xs text-green-600 mt-0.5">
                    Free trial courses are accessible without a paid subscription. These should be short 
                    and do not include assessments or certificates.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {freeTrialCount} of {FREE_TRIAL_COURSE_LIMIT} free trial slots used
                  </p>
                </div>
              </div>
              {freeTrialLimitReached && !formData.is_free_trial && (
                <div className="flex items-center gap-2 mt-2 p-2 bg-amber-100 rounded text-xs text-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Free trial limit reached ({FREE_TRIAL_COURSE_LIMIT} courses). Remove a course from the free trial package to add this one.</span>
                </div>
              )}
            </div>

            <div className="md:col-span-2 p-4 rounded-lg border border-gray-200 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Catalog &amp; audience</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <input
                    name="catalog_visible"
                    type="checkbox"
                    checked={formData.catalog_visible}
                    onChange={handleInputChange}
                    className="h-4 w-4 mt-1 text-blue-600 border-gray-300 rounded"
                  />
                  <div>
                    <label className="text-sm font-medium text-gray-800">Show in course catalog</label>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Turn off to hide this course from the catalog for everyone. Enrolled learners keep access
                      from My Courses and direct links—useful for a single customer or private cohort.
                    </p>
                  </div>
                </div>
                <div>
                  <label htmlFor="restricted_organization_id" className="block text-sm font-medium text-gray-700 mb-1">
                    Restrict catalog visibility to one organization (optional)
                  </label>
                  <select
                    id="restricted_organization_id"
                    name="restricted_organization_id"
                    value={formData.restricted_organization_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    <option value="">All eligible learners (individuals and any organization)</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    When set, only learners in that organization see the course in the catalog. Individual accounts
                    (no organization) will not see it there—enroll them manually if needed.
                  </p>
                </div>
              </div>
            </div>

            {/* Course Resources Section - More Prominent */}
            <div className="mt-8 pt-6 border-t-2 border-primary-light bg-blue-50 -mx-6 px-6 py-6 rounded-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary-default rounded-lg">
                  <Paperclip className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-dark">Course Resources</h3>
                  <p className="text-sm text-text-light">Add links, PDFs, and other materials (displayed at the end of the course)</p>
                </div>
              </div>
              <ResourcesManager
                resources={formData.resources || []}
                onChange={(resources) => setFormData({ ...formData, resources })}
                courseId={course?.id}
                label=""
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="min-w-[120px]"
            >
              {loading ? (
                <LoadingSpinner size="sm" />
              ) : (
                isEditing ? 'Update Course' : 'Create Course'
              )}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
} 
// src/pages/courses/CategoriesManagement.jsx
import { useState, useEffect } from 'react';
import { useCourseStore } from '@/store/courseStore';
import { useAuth } from '@/hooks/auth/useAuth';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  BookOpen,
  Code,
  Palette,
  TrendingUp,
  Heart,
  GraduationCap,
  DollarSign,
  Megaphone,
  Users,
  Globe,
  CheckCircle,
  CircleOff,
  Sparkles,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import MetricTile from '@/components/ui/MetricTile';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import CategoryForm from '@/components/course/CategoryForm';
import { useToast } from '@/components/ui';
import PageTitle from '@/components/layout/PageTitle';

export default function CategoriesManagement() {
  const { user } = useAuth();
  const { success, error: showError, warning } = useToast();
  
  // Store selectors - individual to prevent infinite loops
  const categories = useCourseStore(state => state.categories);
  const loading = useCourseStore(state => state.loading);
  const error = useCourseStore(state => state.error);
  const fetchCategories = useCourseStore(state => state.actions.fetchCategories);
  const deleteCategory = useCourseStore(state => state.actions.deleteCategory);

  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState('all');

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCategorySuccess = (categoryData) => {
    setShowCategoryForm(false);
    setEditingCategory(null);
    // Refresh categories list
    fetchCategories();
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setShowCategoryForm(true);
  };

  const handleDeleteCategory = async (categoryId) => {
    if (window.confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      const result = await deleteCategory(categoryId);
      if (result.success) {
        success('Category deleted successfully!');
        // Refresh categories list
        fetchCategories();
      } else {
        showError(result.error || 'Failed to delete category');
      }
    }
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    setShowCategoryForm(true);
  };

  const getIconComponent = (iconName) => {
    const iconMap = {
      'book-open': BookOpen,
      'code': Code,
      'palette': Palette,
      'trending-up': TrendingUp,
      'heart': Heart,
      'graduation-cap': GraduationCap,
      'dollar-sign': DollarSign,
      'megaphone': Megaphone,
      'users': Users,
      'globe': Globe
    };
    return iconMap[iconName] || BookOpen;
  };

  const filteredCategories = categories?.filter(category => {
    const matchesSearch = category.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         category.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterActive === 'all' || 
                         (filterActive === 'active' && category.is_active) ||
                         (filterActive === 'inactive' && !category.is_active);
    
    return matchesSearch && matchesFilter;
  }) || [];

  if (loading.categories) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageTitle
          title="Category Management"
          subtitle="Manage course categories for better organization"
        />

        <Button onClick={handleAddCategory}>
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricTile
          title="Total Categories"
          value={categories?.length || 0}
          variant="blue"
          icon={BookOpen}
          paddingClassName="p-4"
        />
        <MetricTile
          title="Active"
          value={categories?.filter((c) => c.is_active).length || 0}
          variant="green"
          icon={CheckCircle}
          paddingClassName="p-4"
        />
        <MetricTile
          title="Inactive"
          value={categories?.filter((c) => !c.is_active).length || 0}
          variant="slate"
          icon={CircleOff}
          paddingClassName="p-4"
        />
        <MetricTile
          title="Recently Added"
          value={
            categories?.filter((c) => {
              const createdDate = new Date(c.created_at);
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              return createdDate > weekAgo;
            }).length || 0
          }
          variant="purple"
          icon={Sparkles}
          paddingClassName="p-4"
        />
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search categories..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </Card>

      {/* Categories List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCategories.map((category) => {
          const IconComponent = getIconComponent(category.icon);
          return (
            <Card key={category.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: category.color + '20' }}
                  >
                    <IconComponent 
                      className="w-6 h-6" 
                      style={{ color: category.color }}
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {category.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {category.description || 'No description'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleEditCategory(category)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDeleteCategory(category.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>
                  Created: {new Date(category.created_at).toLocaleDateString()}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  category.is_active 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {category.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredCategories.length === 0 && (
        <Card className="p-12 text-center">
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || filterActive !== 'all' ? 'No categories found' : 'No categories yet'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || filterActive !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first course category'
            }
          </p>
          {!searchTerm && filterActive === 'all' && (
            <Button onClick={handleAddCategory}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Category
            </Button>
          )}
        </Card>
      )}

      {/* Category Form Modal */}
      {showCategoryForm && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CategoryForm
              category={editingCategory}
              onSuccess={handleCategorySuccess}
              onCancel={() => {
                setShowCategoryForm(false);
                setEditingCategory(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
} 
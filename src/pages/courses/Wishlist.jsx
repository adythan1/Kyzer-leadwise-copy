import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCourseStore } from '@/store/courseStore';
import { useAuth } from '@/hooks/auth/useAuth';
import { Heart, Search, BookOpen, Clock, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PageTitle from '@/components/layout/PageTitle';
import { useToast } from '@/components/ui';

export default function Wishlist() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();

  const wishlistCourses = useCourseStore((state) => state.wishlistCourses);
  const loading = useCourseStore((state) => state.loading);
  const fetchWishlistCourses = useCourseStore((state) => state.actions.fetchWishlistCourses);
  const removeFromWishlist = useCourseStore((state) => state.actions.removeFromWishlist);

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchWishlistCourses(user.id);
    }
  }, [user?.id, fetchWishlistCourses]);

  const filteredCourses = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return wishlistCourses || [];

    return (wishlistCourses || []).filter((course) => {
      const title = (course.title || '').toLowerCase();
      const description = (course.description || '').toLowerCase();
      return title.includes(term) || description.includes(term);
    });
  }, [wishlistCourses, searchTerm]);

  const formatDuration = (totalMinutes) => {
    const minutes = Math.max(0, Math.floor(totalMinutes || 0));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  };

  const handleRemove = async (courseId) => {
    if (!user?.id) return;
    const result = await removeFromWishlist(user.id, courseId);
    if (result.error) {
      showError(result.error.message || 'Could not remove course from wishlist.');
      return;
    }
    success('Course removed from wishlist.');
  };

  if (loading.wishlist) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageTitle
          title="My Wishlist"
          subtitle="Courses you saved for later"
        />
        <Link to="/app/courses/catalog">
          <Button>
            <BookOpen className="w-4 h-4 mr-2" />
            Browse Catalog
          </Button>
        </Link>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search wishlist..."
            className="w-full pl-10 pr-4 py-2 border border-background-dark rounded-lg focus:ring-2 focus:ring-primary-default focus:border-primary-default"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </Card>

      {filteredCourses.length === 0 ? (
        <Card className="p-12 text-center">
          <Heart className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-text-dark mb-1">
            {searchTerm ? 'No matching courses in wishlist' : 'Your wishlist is empty'}
          </h3>
          <p className="text-text-light mb-5">
            {searchTerm
              ? 'Try a different keyword.'
              : 'Save courses from the course detail page to see them here.'}
          </p>
          <Link to="/app/courses/catalog">
            <Button>Explore Courses</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <Card key={course.id} className="overflow-hidden flex flex-col">
              {course.thumbnail_url ? (
                <img
                  src={course.thumbnail_url}
                  alt={`${course.title} thumbnail`}
                  className="w-full h-40 object-cover"
                />
              ) : (
                <div className="w-full h-40 bg-background-medium flex items-center justify-center">
                  <BookOpen className="w-10 h-10 text-text-muted" />
                </div>
              )}

              <div className="p-4 flex flex-col flex-1">
                <h3 className="text-base font-semibold text-text-dark mb-2 line-clamp-2">{course.title}</h3>
                <p className="text-sm text-text-light mb-4 line-clamp-2">{course.description}</p>

                <div className="flex items-center text-xs text-text-muted gap-3 mb-4">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDuration(course.duration_minutes)}
                  </span>
                </div>

                <div className="mt-auto flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => navigate(`/app/courses/${course.id}`)}
                  >
                    View Course
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleRemove(course.id)}
                    title="Remove from wishlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

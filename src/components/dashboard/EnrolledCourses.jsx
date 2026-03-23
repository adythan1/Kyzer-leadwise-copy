import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, CheckCircle, BookOpen } from 'lucide-react';
import { useAuth } from '@/hooks/auth/useAuth';
import { supabase } from '@/lib/supabase';

const EnrolledCourses = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEnrolled = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('course_enrollments')
          .select(`
            id,
            progress_percentage,
            status,
            courses (
              id,
              title,
              difficulty_level,
              thumbnail_url
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const mapped = (data || [])
          .filter((e) => e.courses)
          .map((e) => ({
            id: e.courses.id,
            title: e.courses.title,
            difficulty_level: e.courses.difficulty_level,
            thumbnail_url: e.courses.thumbnail_url,
            progress: e.progress_percentage || 0,
            status: e.status,
          }));

        setCourses(mapped);
      } catch {
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEnrolled();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="space-y-3">
          <div className="h-20 bg-background-medium rounded"></div>
          <div className="h-20 bg-background-medium rounded"></div>
          <div className="h-20 bg-background-medium rounded"></div>
        </div>
      </div>
    );
  }

  if (!courses.length) {
    return (
      <div className="text-center py-8">
        <BookOpen className="w-12 h-12 text-text-muted mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-text-dark mb-2">No courses enrolled yet</h3>
        <p className="text-text-light mb-6">Start your learning journey by enrolling in a course</p>
        <Link
          to="/app/courses/catalog"
          className="inline-flex items-center px-4 py-2 bg-primary text-background-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          Browse Courses
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {courses.map((course) => (
        <div key={course.id} className="flex items-center justify-between p-4 bg-background-light rounded-lg">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-12 h-8 rounded overflow-hidden bg-background-medium flex items-center justify-center flex-shrink-0">
              {course.thumbnail_url ? (
                <img src={course.thumbnail_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <BookOpen className="w-4 h-4 text-text-muted" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-medium text-text-dark mb-1 truncate">{course.title}</h3>
              <div className="flex items-center gap-3 text-sm text-text-light">
                {course.difficulty_level && (
                  <span className="px-2 py-0.5 bg-background-medium rounded text-xs">
                    {course.difficulty_level}
                  </span>
                )}
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-24 bg-background-medium h-1.5 rounded-full">
                    <div
                      className="h-1.5 rounded-full bg-primary-default"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                  <span className="text-xs whitespace-nowrap">{course.progress}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-3">
            {course.progress >= 100 ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <Link
                to={`/app/courses/${course.id}`}
                className="p-2 bg-primary text-background-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                <Play className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default EnrolledCourses;

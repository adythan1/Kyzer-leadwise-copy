import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, Clock, Users, BookOpen } from 'lucide-react';
import { useAuth } from '@/hooks/auth/useAuth';
import { supabase, TABLES } from '@/lib/supabase';

const Recommendations = () => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data: profileRow } = await supabase
          .from(TABLES.PROFILES)
          .select('organization_id')
          .eq('id', user.id)
          .maybeSingle();

        const viewerOrgId = profileRow?.organization_id ?? null;

        const { data: enrollments } = await supabase
          .from('course_enrollments')
          .select('course_id, courses(category)')
          .eq('user_id', user.id);

        const enrolledIds = new Set((enrollments || []).map((e) => e.course_id));
        const enrolledCategories = [
          ...new Set(
            (enrollments || [])
              .map((e) => e.courses?.category)
              .filter(Boolean)
          ),
        ];

        let coursesQuery = supabase
          .from(TABLES.COURSES)
          .select('id, title, description, category, duration_minutes, thumbnail_url, difficulty_level, status')
          .eq('status', 'published')
          .eq('catalog_visible', true)
          .limit(50);

        if (viewerOrgId) {
          coursesQuery = coursesQuery.or(
            `restricted_organization_id.is.null,restricted_organization_id.eq.${viewerOrgId}`
          );
        } else {
          coursesQuery = coursesQuery.is('restricted_organization_id', null);
        }

        const { data: allCourses, error } = await coursesQuery;

        if (error) throw error;

        const notEnrolled = (allCourses || []).filter((c) => !enrolledIds.has(c.id));

        const scored = notEnrolled.map((course) => {
          let score = 0;
          if (enrolledCategories.includes(course.category)) {
            score += 10;
          }
          return { ...course, score };
        });

        scored.sort((a, b) => b.score - a.score);

        const mapped = scored.slice(0, 3).map((c) => ({
          id: c.id,
          title: c.title,
          description: c.description || '',
          thumbnail: c.thumbnail_url,
          duration: c.duration_minutes ? `${c.duration_minutes} min` : 'Self-paced',
          category: c.category,
          difficulty_level: c.difficulty_level,
        }));

        setRecommendations(mapped);
      } catch {
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="space-y-3">
          <div className="h-24 bg-background-medium rounded"></div>
          <div className="h-24 bg-background-medium rounded"></div>
          <div className="h-24 bg-background-medium rounded"></div>
        </div>
      </div>
    );
  }

  if (!recommendations.length) {
    return (
      <div className="text-center py-8">
        <BookOpen className="w-12 h-12 text-text-muted mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-text-dark mb-2">No recommendations yet</h3>
        <p className="text-text-light">Complete more courses to get personalized recommendations</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recommendations.map((course) => (
        <div key={course.id} className="p-4 bg-background-light rounded-lg hover:shadow-md transition-shadow duration-200">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {course.thumbnail ? (
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-16 h-12 object-cover rounded-lg bg-background-medium"
                />
              ) : (
                <div className="w-16 h-12 rounded-lg bg-background-medium flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-text-muted" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-text-dark mb-1 line-clamp-1">{course.title}</h3>
              <p className="text-xs text-text-light mb-2 line-clamp-2">{course.description}</p>
              <div className="flex items-center gap-4 text-xs text-text-light">
                {course.category && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-warning" />
                    <span>{course.category}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{course.duration}</span>
                </div>
                {course.difficulty_level && (
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{course.difficulty_level}</span>
                  </div>
                )}
              </div>
            </div>

            <Link
              to={`/app/courses/${course.id}`}
              className="px-3 py-1.5 bg-primary text-background-white text-xs font-medium rounded-lg hover:bg-primary-dark transition-colors flex-shrink-0"
            >
              View
            </Link>
          </div>
        </div>
      ))}

      <Link
        to="/app/courses/catalog"
        className="block text-center text-sm text-primary hover:text-primary-dark transition-colors pt-2"
      >
        Browse all courses
      </Link>
    </div>
  );
};

export default Recommendations;

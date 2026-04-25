// Public course preview for shared links. Full content requires sign-in and plan/enrollment.
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  BookOpen,
  Clock,
  Layers,
  Lock,
  ArrowRight,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { apiGet } from '@/lib/apiClient';
import { useAuth } from '@/hooks/auth/useAuth';
import { useSubscription } from '@/hooks/courses/useSubscription';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import PageTitle from '@/components/layout/PageTitle';
import { FreeTrialBadge, UpgradeBanner } from '@/components/course/UpgradePrompt';

/** Accept any canonical UUID string from the URL (avoids false “unavailable” for valid ids). */
const COURSE_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatDurationMinutes(totalMinutes) {
  const n = Number(totalMinutes) || 0;
  if (n <= 0) return null;
  if (n < 60) return `${n} min`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default function PublicCourseSharePreview() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canAccessCourse, isFreeTrial } = useSubscription();

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [enrollment, setEnrollment] = useState(null);

  const courseIdValid = useMemo(() => courseId && COURSE_ID_RE.test(courseId), [courseId]);

  const previewCourseShape = useMemo(
    () => (preview ? { is_free_trial: preview.is_free_trial } : null),
    [preview]
  );

  const userCanAccess =
    previewCourseShape && user ? canAccessCourse(previewCourseShape) : false;
  const isPlanLocked = Boolean(preview) && Boolean(user) && isFreeTrial && !userCanAccess;

  useEffect(() => {
    let cancelled = false;

    const loadPreview = async () => {
      if (!courseIdValid) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      setNotFound(false);
      setFetchError(null);

      try {
        const result = await apiGet(`/courses/${courseId}/share-preview`);
        const data = result?.data ?? null;

        if (cancelled) return;

        if (data == null || (typeof data === 'object' && Object.keys(data).length === 0)) {
          setNotFound(true);
          setFetchError(null);
          setPreview(null);
          return;
        }

        const row = typeof data === 'string' ? JSON.parse(data) : data;
        setFetchError(null);
        setPreview(row);
      } catch (error) {
        if (cancelled) return;
        setFetchError(error?.message || 'Could not load course preview.');
        setNotFound(false);
        setPreview(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPreview();
    return () => {
      cancelled = true;
    };
  }, [courseId, courseIdValid]);

  useEffect(() => {
    let cancelled = false;

    const loadEnrollment = async () => {
      if (!user?.id || !courseIdValid || !courseId) {
        setEnrollment(null);
        return;
      }

      const { data, error } = await supabase
        .from('course_enrollments')
        .select('id, progress_percentage, status')
        .eq('course_id', courseId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        setEnrollment(null);
        return;
      }
      setEnrollment(data);
    };

    loadEnrollment();
    return () => {
      cancelled = true;
    };
  }, [user?.id, courseId, courseIdValid]);

  const instructorLabel = useMemo(() => {
    if (!preview?.instructor) return null;
    const fn = preview.instructor.first_name || '';
    const ln = preview.instructor.last_name || '';
    const full = `${fn} ${ln}`.trim();
    return full || null;
  }, [preview]);

  const durationLabel = formatDurationMinutes(preview?.duration_minutes);
  const modules = Array.isArray(preview?.modules) ? preview.modules : [];

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center">
        <PageTitle title="Preview could not be loaded" />
        <p className="text-text-light mt-2 mb-4">
          The server could not run the{' '}
          <code className="text-xs bg-background-light px-1 rounded mx-0.5">get_course_share_preview</code> function.
          Run the latest share-preview migrations on Supabase (
          <code className="text-xs bg-background-light px-1 rounded">supabase db push</code> or SQL editor): they align the
          RPC with your schema (e.g. no <code className="text-xs bg-background-light px-1 rounded">courses.subtitle</code>
          , and{' '}
          <code className="text-xs bg-background-light px-1 rounded">20260407_course_share_preview_is_free_trial_column.sql</code>{' '}
          adds <code className="text-xs bg-background-light px-1 rounded">is_free_trial</code> if it is missing). Then
          reload this page.
        </p>
        {import.meta.env.DEV ? (
          <pre className="text-left text-xs text-text-muted bg-background-light rounded-lg p-3 mb-6 overflow-x-auto whitespace-pre-wrap break-words">
            {fetchError}
          </pre>
        ) : null}
        <Button variant="secondary" onClick={() => navigate('/')}>
          Back to home
        </Button>
      </div>
    );
  }

  if (notFound || !preview) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center">
        <PageTitle title="Course unavailable" />
        <p className="text-text-light mt-2 mb-6">
          This course is not available for a public preview. It may be unpublished (still in draft),
          limited to a specific organization, or the link may be incorrect. Published catalog courses
          shared from the app use the same rules: they must be published and not organization-restricted.
        </p>
        <Button variant="secondary" onClick={() => navigate('/')}>
          Back to home
        </Button>
      </div>
    );
  }

  const appCoursePath = `/app/courses/${preview.id}`;
  const loginState = { from: { pathname: appCoursePath } };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <PageTitle
        title={preview.title}
        subtitle={preview.subtitle || 'Course preview'}
        className="mb-6"
      />

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="rounded-xl overflow-hidden bg-background-white border border-background-dark shadow-sm">
          {preview.thumbnail_url ? (
            <div className="relative aspect-video">
              <img
                src={preview.thumbnail_url}
                alt=""
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
                {preview.is_free_trial ? <FreeTrialBadge /> : null}
                {!preview.is_free_trial ? (
                  <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-xs font-medium">
                    <Lock className="w-3 h-3" />
                    Subscription
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="p-5 space-y-4">
            <div className="flex flex-wrap gap-3 text-sm text-text-light">
              {preview.category ? (
                <span className="inline-flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  {preview.category}
                </span>
              ) : null}
              {preview.difficulty_level ? (
                <span className="inline-flex items-center gap-1 capitalize">
                  <Layers className="w-4 h-4" />
                  {preview.difficulty_level}
                </span>
              ) : null}
              {durationLabel ? (
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {durationLabel}
                </span>
              ) : null}
              {preview.total_lessons > 0 ? (
                <span>
                  {preview.total_lessons} lesson{preview.total_lessons === 1 ? '' : 's'}
                </span>
              ) : null}
            </div>

            {preview.description ? (
              <p className="text-sm text-text-dark leading-relaxed line-clamp-6">{preview.description}</p>
            ) : null}

            {instructorLabel ? (
              <p className="text-sm text-text-light">
                <span className="font-medium text-text-dark">Instructor:</span> {instructorLabel}
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-text-dark mb-3">Get full access</h2>
            <p className="text-sm text-text-light mb-4">
              Sign in to enroll, track progress, and open lessons. Some courses require a paid plan.
            </p>

            {!user && (
              <div className="flex flex-col sm:flex-row gap-2">
                <Button className="flex-1" onClick={() => navigate('/signup')}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create account
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => navigate('/login', { state: loginState })}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign in
                </Button>
              </div>
            )}

            {user && enrollment && (
              <Button className="w-full" onClick={() => navigate(appCoursePath)}>
                Continue to course
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}

            {user && !enrollment && userCanAccess && (
              <Button className="w-full" onClick={() => navigate(appCoursePath)}>
                Open course to enroll
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}

            {user && !enrollment && isPlanLocked && (
              <div className="space-y-3">
                <p className="text-sm text-text-light">
                  Your current plan does not include this catalog course. Upgrade to unlock it and
                  the full library.
                </p>
                <UpgradeBanner className="!p-4" />
              </div>
            )}
          </Card>

          <div className="relative rounded-xl border border-background-dark bg-background-white overflow-hidden">
            <div className="px-4 py-3 border-b border-background-light flex items-center justify-between bg-background-light/80">
              <h3 className="font-semibold text-text-dark flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Curriculum outline
              </h3>
              <span className="text-xs text-text-muted inline-flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Preview
              </span>
            </div>
            <ul className="divide-y divide-background-light max-h-[320px] overflow-y-auto">
              {modules.length === 0 ? (
                <li className="px-4 py-6 text-sm text-text-light text-center">Modules coming soon.</li>
              ) : (
                modules.map((mod, idx) => (
                  <li key={`${mod.title}-${idx}`} className="px-4 py-3 relative">
                    <div className="blur-[3px] pointer-events-none select-none opacity-70">
                      <p className="font-medium text-text-dark">{mod.title}</p>
                      <p className="text-xs text-text-light mt-1">
                        {mod.lesson_count != null
                          ? `${mod.lesson_count} lesson${mod.lesson_count === 1 ? '' : 's'}`
                          : 'Lessons'}
                      </p>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-background-white/55">
                      <span className="text-xs font-medium text-text-dark bg-background-light/95 border border-background-dark px-2 py-1 rounded-full inline-flex items-center gap-1 shadow-sm">
                        <Lock className="w-3 h-3" />
                        Sign in to unlock
                      </span>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

          <p className="text-xs text-text-muted text-center">
            Already have an account?{' '}
            <Link to="/login" state={loginState} className="text-primary font-medium hover:underline">
              Sign in
            </Link>{' '}
            to continue.
          </p>
        </div>
      </div>
    </div>
  );
}

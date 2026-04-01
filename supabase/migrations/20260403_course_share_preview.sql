-- Public course preview for share links (anon-safe). Returns metadata + module titles only — no lesson content URLs.

CREATE OR REPLACE FUNCTION public.get_course_share_preview(p_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c record;
  category_name text;
  instructor jsonb;
  modules jsonb;
  total_lessons int;
BEGIN
  SELECT
    co.id,
    co.title,
    co.subtitle,
    co.description,
    co.thumbnail_url,
    co.is_free_trial,
    co.is_published,
    co.catalog_visible,
    co.restricted_organization_id,
    co.difficulty_level,
    co.duration_minutes,
    co.created_by,
    cat.name AS cat_name
  INTO c
  FROM public.courses co
  LEFT JOIN public.course_categories cat ON cat.id = co.category_id
  WHERE co.id = p_course_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF NOT c.is_published
     OR NOT c.catalog_visible
     OR c.restricted_organization_id IS NOT NULL
  THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'title', m.title,
        'lesson_count', lesson_counts.cnt
      )
      ORDER BY m.order_index NULLS LAST
    ),
    '[]'::jsonb
  )
  INTO modules
  FROM public.course_modules m
  CROSS JOIN LATERAL (
    SELECT count(*)::int AS cnt
    FROM public.lessons l
    WHERE l.module_id = m.id
  ) AS lesson_counts
  WHERE m.course_id = p_course_id;

  SELECT count(*)::int
  INTO total_lessons
  FROM public.lessons
  WHERE course_id = p_course_id;

  category_name := c.cat_name;

  SELECT jsonb_build_object(
    'first_name', p.first_name,
    'last_name', p.last_name
  )
  INTO instructor
  FROM public.profiles p
  WHERE p.id = c.created_by;

  RETURN jsonb_build_object(
    'id', c.id,
    'title', c.title,
    'subtitle', c.subtitle,
    'description', c.description,
    'thumbnail_url', c.thumbnail_url,
    'is_free_trial', c.is_free_trial,
    'difficulty_level', c.difficulty_level,
    'duration_minutes', c.duration_minutes,
    'category', category_name,
    'instructor', instructor,
    'modules', COALESCE(modules, '[]'::jsonb),
    'total_lessons', COALESCE(total_lessons, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_course_share_preview(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_course_share_preview(uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.get_course_share_preview(uuid) IS
  'Marketing/share preview: safe course snapshot for anon users. Only published, catalog-visible, non-org-restricted courses.';

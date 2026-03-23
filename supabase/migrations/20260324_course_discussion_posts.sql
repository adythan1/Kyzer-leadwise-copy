-- Per-course discussion / community forum for enrolled learners
CREATE TABLE IF NOT EXISTS course_discussion_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  parent_id UUID REFERENCES public.course_discussion_posts(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(trim(body)) > 0 AND char_length(body) <= 8000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_discussion_posts_course_created
  ON public.course_discussion_posts (course_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_course_discussion_posts_parent
  ON public.course_discussion_posts (parent_id)
  WHERE parent_id IS NOT NULL;

ALTER TABLE public.course_discussion_posts ENABLE ROW LEVEL SECURITY;

-- Enrolled learners can read posts for their course
CREATE POLICY course_discussion_posts_select_enrolled
  ON public.course_discussion_posts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.course_enrollments e
      WHERE e.course_id = course_discussion_posts.course_id
        AND e.user_id = auth.uid()
        AND e.status = 'active'
    )
  );

-- Enrolled learners can insert their own posts
CREATE POLICY course_discussion_posts_insert_enrolled
  ON public.course_discussion_posts
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.course_enrollments e
      WHERE e.course_id = course_discussion_posts.course_id
        AND e.user_id = auth.uid()
        AND e.status = 'active'
    )
  );

CREATE POLICY course_discussion_posts_update_own
  ON public.course_discussion_posts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY course_discussion_posts_delete_own
  ON public.course_discussion_posts
  FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.course_discussion_posts IS 'Course-scoped forum posts; visible only to actively enrolled learners.';

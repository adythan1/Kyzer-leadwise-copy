-- User wishlist for saving courses to review later.
CREATE TABLE IF NOT EXISTS public.course_wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

ALTER TABLE public.course_wishlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own wishlist" ON public.course_wishlist;
CREATE POLICY "Users can read their own wishlist"
ON public.course_wishlist
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add to their own wishlist" ON public.course_wishlist;
CREATE POLICY "Users can add to their own wishlist"
ON public.course_wishlist
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove from their own wishlist" ON public.course_wishlist;
CREATE POLICY "Users can remove from their own wishlist"
ON public.course_wishlist
FOR DELETE
USING (auth.uid() = user_id);

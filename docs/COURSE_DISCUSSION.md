# Course community (discussion forum)

Per-course discussion for **actively enrolled** learners. Data lives in `course_discussion_posts` with RLS tied to `course_enrollments` (`status = 'active'`).

## Apply the migration

From the project root (with Supabase CLI linked to your project):

```bash
supabase db push
# or run the SQL in Supabase Dashboard → SQL Editor:
# supabase/migrations/20260324_course_discussion_posts.sql
```

## UI

- **Course page** → **Community** tab (`/app/courses/:courseId?tab=community`).
- **Lesson view** → **Community** link in the top bar (desktop) → same URL.

## Behavior

- **Signed out:** message to sign in.
- **Signed in, not enrolled:** prompt to enroll before participating.
- **Enrolled:** read all posts for that course, start threads, reply (nested up to depth 4 in the UI).

## Moderation

There is no admin moderation UI yet. Instructors can add policies or a dashboard later; for now posts are user-owned (update/delete own only via RLS).

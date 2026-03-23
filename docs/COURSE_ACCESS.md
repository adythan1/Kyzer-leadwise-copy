# Course catalog access (individuals & organizations)

## Apply the migration

Run the Supabase migration that adds catalog columns:

- `supabase/migrations/20260325_course_access_catalog_org.sql`

Until this is applied, queries that filter on `catalog_visible` or `restricted_organization_id` will fail.

## Fields on `courses`

| Column | Purpose |
|--------|---------|
| **`catalog_visible`** | `true` (default): course can appear in the learner catalog when published. `false`: hidden from the catalog; existing enrollments and direct links still work (use for private cohorts or single-customer content). |
| **`restricted_organization_id`** | `NULL`: any eligible learner can see the course in the catalog (subject to `catalog_visible` and publish state). Set to an organization UUID: only learners whose profile has that `organization_id` see the course **in the catalog**. Individual accounts (no org) do not see org-restricted courses in the catalog. |

## How filtering works (app layer)

- **Course catalog** and **dashboard recommendations** use the same rules for “who sees this in the catalog”:
  - Published + `catalog_visible = true`.
  - If the viewer has an **organization**: show courses with `restricted_organization_id IS NULL` **or** matching their org.
  - If the viewer has **no organization** (individual): show only courses with `restricted_organization_id IS NULL`.

Admins managing courses use `fetchCourses` **without** `learnerCatalog`, so they still see drafts and all courses.

## Row Level Security (RLS)

Visibility is enforced in application queries today. Tightening **RLS** on `courses` for anonymous/authenticated reads would be a separate hardening step if you need defense in depth.

## Authoring in the UI

In **Course create/edit** (`CourseForm`):

- **Show in course catalog** — maps to `catalog_visible`.
- **Restrict catalog visibility to one organization** — maps to `restricted_organization_id` (empty = global catalog for eligible learners).

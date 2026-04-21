-- Add price column to courses table
-- 0 = free course; any positive value = paid course.
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) NOT NULL DEFAULT 0;

-- Backfill any existing rows that ended up with NULL (e.g. if column already existed as nullable)
UPDATE courses SET price = 0 WHERE price IS NULL;

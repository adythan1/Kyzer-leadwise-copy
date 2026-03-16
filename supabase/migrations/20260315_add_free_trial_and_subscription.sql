-- Add is_free_trial column to courses table
-- Courses marked as free trial are accessible without a paid subscription
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS is_free_trial BOOLEAN NOT NULL DEFAULT false;

-- Add subscription_plan column to profiles table
-- Tracks the individual user's current subscription tier
-- Defaults to 'free_trial' for users who haven't subscribed yet
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT NOT NULL DEFAULT 'free_trial';

-- Index for quick lookups of free trial courses
CREATE INDEX IF NOT EXISTS idx_courses_is_free_trial
  ON courses (is_free_trial)
  WHERE is_free_trial = true;

-- Index for subscription plan filtering
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_plan
  ON profiles (subscription_plan);

-- Database Migration: Add business_name and profile_completed fields
-- Run this in Supabase SQL Editor to update your existing database

-- Add business_name column (allows NULL for existing users)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS business_name VARCHAR(255);

-- Add profile_completed column (default FALSE for existing users)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;

-- Update existing users to have profile_completed = TRUE
-- (Assuming existing users have already completed signup)
UPDATE users 
SET profile_completed = TRUE 
WHERE password IS NOT NULL;

-- Display updated table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

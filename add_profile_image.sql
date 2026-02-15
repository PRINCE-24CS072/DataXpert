-- Add profile_image column to users table
-- Run this in Supabase SQL Editor

ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image TEXT;

-- Set default profile image for existing users without one
UPDATE users 
SET profile_image = 'https://ui-avatars.com/api/?name=' || REPLACE(name, ' ', '+') || '&background=6366f1&color=fff&size=200'
WHERE profile_image IS NULL;

-- Verify the change
SELECT id, name, email, profile_image FROM users LIMIT 5;

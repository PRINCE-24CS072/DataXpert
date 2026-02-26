-- Database Verification: Check Google Authentication Columns
-- Run this in Supabase SQL Editor to verify your database is ready

-- Verify all required columns exist
DO $$ 
BEGIN
    -- Check profile_image column
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'profile_image'
    ) THEN
        RAISE NOTICE '✓ profile_image column exists';
    ELSE
        RAISE NOTICE '✗ profile_image column missing - Adding now...';
        ALTER TABLE users ADD COLUMN profile_image TEXT;
        RAISE NOTICE '✓ Added profile_image column';
    END IF;
    
    -- Check google_id column
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'google_id'
    ) THEN
        RAISE NOTICE '✓ google_id column exists';
    ELSE
        RAISE NOTICE '✗ google_id column missing - Adding now...';
        ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
        RAISE NOTICE '✓ Added google_id column';
    END IF;
    
    -- Check profile_completed column
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'profile_completed'
    ) THEN
        RAISE NOTICE '✓ profile_completed column exists';
    ELSE
        RAISE NOTICE '✗ profile_completed column missing - Adding now...';
        ALTER TABLE users ADD COLUMN profile_completed BOOLEAN DEFAULT FALSE;
        RAISE NOTICE '✓ Added profile_completed column';
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ Database is ready for Google Authentication!';
END $$;

-- Show all user table columns to verify structure
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

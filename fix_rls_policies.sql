-- ============================================
-- FIX: Supabase Row Level Security (RLS) Policies
-- ============================================
-- Run this script in your Supabase SQL Editor to fix the signup issue

-- Option 1: DISABLE RLS (Quick fix for development - NOT RECOMMENDED FOR PRODUCTION)
-- Uncomment the lines below if you want to disable RLS temporarily:
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE business_data DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE chats DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE analysis_results DISABLE ROW LEVEL SECURITY;

-- Option 2: CREATE PROPER RLS POLICIES (RECOMMENDED)
-- This allows the service role (your backend) to manage all data

-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable all access for service role" ON users;
DROP POLICY IF EXISTS "Enable all access for service role" ON teams;
DROP POLICY IF EXISTS "Enable all access for service role" ON team_members;
DROP POLICY IF EXISTS "Enable all access for service role" ON business_data;
DROP POLICY IF EXISTS "Enable all access for service role" ON chats;
DROP POLICY IF EXISTS "Enable all access for service role" ON analysis_results;

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;

-- Create policies that allow all operations
-- Note: These policies allow all access. In production, you should implement more restrictive policies.

-- Users table policies
CREATE POLICY "Enable all access for service role" ON users
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Teams table policies
CREATE POLICY "Enable all access for service role" ON teams
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Team members table policies
CREATE POLICY "Enable all access for service role" ON team_members
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Business data table policies
CREATE POLICY "Enable all access for service role" ON business_data
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Chats table policies
CREATE POLICY "Enable all access for service role" ON chats
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Analysis results table policies
CREATE POLICY "Enable all access for service role" ON analysis_results
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

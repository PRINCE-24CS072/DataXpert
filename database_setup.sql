-- DataXpert Database Setup Script
-- Run this in Supabase SQL Editor to create all required tables

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- ============================================
-- 2. TEAMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    team_name VARCHAR(255) NOT NULL,
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create index on owner_id
CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id);

-- ============================================
-- 3. TEAM_MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);

-- ============================================
-- 4. BUSINESS_DATA TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS business_data (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    record_date DATE NOT NULL,
    sales FLOAT NOT NULL,
    expenses FLOAT NOT NULL,
    profit FLOAT NOT NULL,
    category VARCHAR(100)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_business_data_user ON business_data(user_id);
CREATE INDEX IF NOT EXISTS idx_business_data_date ON business_data(record_date);
CREATE INDEX IF NOT EXISTS idx_business_data_category ON business_data(category);

-- ============================================
-- 5. CHATS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS chats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    response TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Create index on user_id
CREATE INDEX IF NOT EXISTS idx_chats_user ON chats(user_id);

-- ============================================
-- 6. ANALYSIS_RESULTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS analysis_results (
    id SERIAL PRIMARY KEY,
    chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    anomaly_score FLOAT DEFAULT 0.0,
    insight_level VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create index on chat_id
CREATE INDEX IF NOT EXISTS idx_analysis_results_chat ON analysis_results(chat_id);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify all tables were created:

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' a
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ============================================
-- SAMPLE DATA (OPTIONAL - for testing)
-- ============================================
-- Uncomment below to insert sample test data

/*
-- Insert test user
INSERT INTO users (name, email, password, role) 
VALUES ('Test User', 'test@dataxpert.com', 'test123', 'user');

-- Insert test business data
INSERT INTO business_data (user_id, record_date, sales, expenses, profit, category)
VALUES 
    (1, '2026-01-01', 5000.00, 3000.00, 2000.00, 'Retail'),
    (1, '2026-01-02', 6000.00, 3500.00, 2500.00, 'Services'),
    (1, '2026-01-03', 4500.00, 2800.00, 1700.00, 'Retail');
*/

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE 'DataXpert database tables created successfully!';
END $$;

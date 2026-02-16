-- Activity Log / Audit Trail Table
-- Run this in Supabase SQL Editor

-- Create activity_log table for tracking all user operations
CREATE TABLE IF NOT EXISTS activity_log (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,  -- 'upload', 'delete', 'clear', 'analysis', 'edit', 'login', 'export'
    action_description TEXT,
    entity_type VARCHAR(50),  -- 'business_data', 'analysis', 'team', 'profile'
    entity_id BIGINT,  -- Reference to the affected record
    metadata JSONB DEFAULT '{}',  -- Store additional details like filename, record counts, etc.
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create data_backups table for storing cleared/deleted data
CREATE TABLE IF NOT EXISTS data_backups (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    backup_type VARCHAR(50) NOT NULL,  -- 'pre_clear', 'pre_delete', 'manual'
    data_snapshot JSONB NOT NULL,  -- Store the actual data as JSON
    record_count INT DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,  -- When the backup should be auto-deleted (30 days default)
    restored BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create upload_history table for tracking file uploads
CREATE TABLE IF NOT EXISTS upload_history (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(10),  -- 'csv', 'xlsx', 'xls'
    file_size BIGINT,  -- in bytes
    original_rows INT DEFAULT 0,
    processed_rows INT DEFAULT 0,
    records_added INT DEFAULT 0,
    outliers_removed INT DEFAULT 0,
    missing_filled INT DEFAULT 0,
    processing_options JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'completed',  -- 'completed', 'failed', 'partial'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analysis_history table for tracking AI analysis
CREATE TABLE IF NOT EXISTS analysis_history (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    chat_id BIGINT REFERENCES chats(id) ON DELETE SET NULL,
    query_text TEXT NOT NULL,
    analysis_type VARCHAR(50),  -- 'sales', 'profit', 'trend', 'forecast', etc.
    result_summary TEXT,
    insights JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    chart_data JSONB,  -- Store generated chart data
    data_snapshot JSONB,  -- Store the data used for analysis
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_action_type ON activity_log(action_type);

CREATE INDEX IF NOT EXISTS idx_data_backups_user_id ON data_backups(user_id);
CREATE INDEX IF NOT EXISTS idx_data_backups_expires_at ON data_backups(expires_at);

CREATE INDEX IF NOT EXISTS idx_upload_history_user_id ON upload_history(user_id);
CREATE INDEX IF NOT EXISTS idx_upload_history_created_at ON upload_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analysis_history_user_id ON analysis_history(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_history_created_at ON analysis_history(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own activity log" ON activity_log
    FOR SELECT USING (auth.uid()::text = user_id::text OR user_id IN (
        SELECT id FROM users WHERE id = user_id
    ));

CREATE POLICY "Users can view own backups" ON data_backups
    FOR SELECT USING (auth.uid()::text = user_id::text OR user_id IN (
        SELECT id FROM users WHERE id = user_id
    ));

CREATE POLICY "Users can view own upload history" ON upload_history
    FOR SELECT USING (auth.uid()::text = user_id::text OR user_id IN (
        SELECT id FROM users WHERE id = user_id
    ));

CREATE POLICY "Users can view own analysis history" ON analysis_history
    FOR SELECT USING (auth.uid()::text = user_id::text OR user_id IN (
        SELECT id FROM users WHERE id = user_id
    ));

-- Function to auto-delete expired backups (run as cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_backups()
RETURNS void AS $$
BEGIN
    DELETE FROM data_backups WHERE expires_at < NOW() AND restored = FALSE;
END;
$$ LANGUAGE plpgsql;

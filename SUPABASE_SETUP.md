# 🗄️ Supabase Database Setup Guide

## Why Tables Aren't Auto-Created

The DataXpert application **connects** to Supabase but doesn't automatically create tables. You need to manually create them in Supabase SQL Editor.

## 📋 Quick Setup Steps

### 1. Open Supabase SQL Editor

1. Go to [https://supabase.com](https://supabase.com)
2. Open your DataXpert project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New Query"**

### 2. Copy & Paste SQL Script

1. Open the file: `database_setup.sql` in this project
2. **Copy ALL the SQL code** (Ctrl+A, Ctrl+C)
3. **Paste into Supabase SQL Editor**
4. Click **"RUN"** button (or press Ctrl+Enter)

### 3. Verify Tables Created

You should see:
```
✓ users
✓ teams
✓ team_members
✓ business_data
✓ chats
✓ analysis_results
```

Run this verification query:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

## 🔍 What Gets Created

### Tables:
1. **users** - User accounts (email/password + Google OAuth)
2. **teams** - Business teams
3. **team_members** - Team membership
4. **business_data** - Sales, expenses, profit records
5. **chats** - AI chat history
6. **analysis_results** - AI analysis insights

### Indexes:
- Email and Google ID indexes for fast login
- User ID indexes for quick data retrieval
- Date indexes for time-based queries

### Features:
- ✅ Foreign key relationships
- ✅ Cascade delete (deleting user removes their data)
- ✅ Timestamps (created_at, joined_at)
- ✅ Unique constraints (no duplicate emails)

## ⚠️ Common Issues

### Issue: "relation already exists"
**Solution:** Tables already created! You're good to go.

### Issue: "permission denied"
**Solution:** Make sure you're logged into the correct Supabase project.

### Issue: "syntax error"
**Solution:** Make sure you copied the ENTIRE SQL script from `database_setup.sql`

## 🧪 Testing the Setup

### Option 1: Use the App
1. Start the DataXpert application
2. Sign up with a new account
3. Add business data
4. Check Supabase Table Editor to see the data

### Option 2: Insert Test Data
Run this in SQL Editor:
```sql
-- Insert test user
INSERT INTO users (name, email, password, role) 
VALUES ('Test User', 'test@dataxpert.com', 'test123', 'user');

-- Check if user was created
SELECT * FROM users;
```

## 📊 View Your Data

After creating tables:
1. Click **"Table Editor"** in Supabase sidebar
2. Select any table (users, business_data, etc.)
3. View/edit data directly in the browser

## 🔐 Security (Optional but Recommended)

### Enable Row Level Security (RLS):

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own data
CREATE POLICY "Users can view own data" 
ON business_data FOR SELECT 
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own data" 
ON business_data FOR INSERT 
WITH CHECK (auth.uid()::text = user_id::text);
```

## ✅ Next Steps

After tables are created:
1. ✅ Restart your backend server (if running)
2. ✅ Test signup/login on the app
3. ✅ Add business data
4. ✅ Try AI analysis

---

**Need Help?** Check the [README.md](README.md) or [Setup Guide](documentation/setup.html)

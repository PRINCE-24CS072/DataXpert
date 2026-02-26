# 🧪 Google Authentication Testing Guide

## Quick Test Script

### Pre-requisites
- [ ] Backend running on http://localhost:5000
- [ ] Frontend running on http://localhost:5500
- [ ] Supabase database configured
- [ ] Google OAuth credentials set in .env
- [ ] Run database migration: `database_migration_google_auth.sql`

---

## Test 1: New User Signup ✅

**Steps:**
1. Open `http://localhost:5500` in **incognito mode**
2. Click "Sign Up" button
3. Click "Sign up with Google" button
4. Select a Google account (not used before)
5. Authorize the app

**Expected Results:**
- ✅ See message: "✓ Account created! Please complete your profile (business name)"
- ✅ Redirected to dashboard after ~1.5 seconds
- ✅ Banner shows: "Complete Your Profile - Add business details..."
- ✅ Profile picture loaded from Google account
- ✅ Username displayed correctly in top-right

**Verify in Supabase:**
```sql
SELECT id, name, email, google_id, profile_image, business_name, password 
FROM users 
WHERE email = 'your-test-email@gmail.com';
```
- ✅ `google_id` is populated
- ✅ `profile_image` is URL from Google
- ✅ `password` is hashed (not NULL)
- ✅ `business_name` is NULL

---

## Test 2: Duplicate Signup Attempt ❌

**Steps:**
1. Stay logged in from Test 1 (or use same Google account)
2. Logout (click Logout button)
3. On landing page, click "Sign Up"
4. Click "Sign up with Google"
5. Select the SAME Google account as Test 1

**Expected Results:**
- ❌ See error: "⚠ Account already exists. Please login instead"
- ✅ After 2 seconds, signup modal closes
- ✅ Login modal opens automatically
- ✅ No new user created in database

---

## Test 3: Existing User Login ✅

**Steps:**
1. Ensure you have an existing account (from Test 1)
2. If logged in, logout
3. Click "Login" button
4. Click "Login with Google"
5. Select the existing Google account

**Expected Results:**
- ✅ See message: "✓ Welcome back! Please complete your profile" (if business_name missing)
  OR "Login successful!" (if profile complete)
- ✅ Redirected to dashboard
- ✅ Banner shows if business_name is still NULL
- ✅ All user data loaded correctly

**Verify in Console:**
```javascript
console.log(localStorage.getItem('dataxpert_token')); // Should show JWT
console.log(JSON.parse(localStorage.getItem('dataxpert_user'))); // Should show user object
```

---

## Test 4: Login Without Account ❌

**Steps:**
1. Open new incognito window
2. Go to landing page
3. Click "Login" button
4. Click "Login with Google"
5. Select a Google account that has NEVER signed up

**Expected Results:**
- ❌ See error: "⚠ No account found. Please sign up first"
- ✅ After 2 seconds, login modal closes
- ✅ Signup modal opens automatically
- ✅ No user created in database

---

## Test 5: Profile Completion 📝

**Steps:**
1. Login with Google account (ensure business_name is NULL)
2. Verify banner shows on dashboard
3. Click "Complete Now" button
4. On profile page, fill in:
   - Business Name: "Test Business Inc"
5. Click "Save Changes"
6. Click "Dashboard" in sidebar

**Expected Results:**
- ✅ See success message: "Profile updated successfully! ✓"
- ✅ Return to dashboard
- ✅ Banner is GONE (not visible)
- ✅ No localStorage flags present

**Verify in Supabase:**
```sql
SELECT business_name FROM users WHERE email = 'your-test-email@gmail.com';
```
- ✅ `business_name` = "Test Business Inc"

**Verify in Console:**
```javascript
console.log(localStorage.getItem('dataxpert_needs_profile_completion')); // Should be null
```

---

## Test 6: Manual Account + Google Login 🔗

**Steps:**
1. Open new incognito window
2. Sign up with Email/Password:
   - Username: "Manual User"
   - Business: "Manual Business"
   - Email: Use a Gmail address
   - Password: "test123456"
3. Logout
4. Click "Login"
5. Click "Login with Google"
6. Select the SAME Gmail account used in step 2

**Expected Results:**
- ✅ Login successful
- ✅ Redirected to dashboard
- ✅ No errors
- ✅ Profile picture now shows Google avatar

**Verify in Supabase:**
```sql
SELECT google_id, profile_image, password FROM users WHERE email = 'your-gmail@gmail.com';
```
- ✅ `google_id` is NOW populated (was NULL before)
- ✅ `profile_image` updated to Google photo
- ✅ `password` still exists (unchanged, for manual login)

**Test Manual Login Still Works:**
1. Logout
2. Login with Email + Password
3. Should work perfectly

---

## Test 7: Banner Dismissal 🚫

**Steps:**
1. Login with account that has NULL business_name
2. See banner on dashboard
3. Click the [×] button on banner
4. Refresh the page

**Expected Results:**
- ✅ Banner hidden after clicking [×]
- ✅ Banner stays hidden after refresh (same session)
- ✅ Banner appears again in new incognito window (new session)

**Verify in Console:**
```javascript
console.log(localStorage.getItem('dataxpert_profile_banner_dismissed')); // Should be 'true'
```

---

## Test 8: Multi-Tab Consistency 🔄

**Steps:**
1. Login with Google in Tab 1
2. Open Tab 2 (same browser)
3. Go to dashboard in Tab 2
4. In Tab 1, complete profile (add business name)
5. In Tab 2, refresh dashboard

**Expected Results:**
- Tab 1: ✅ Profile updated, no issues
- Tab 2 (after refresh): ✅ User data refreshed from API
- Tab 2: ⚠️ Banner might still show (localStorage not synced)
  - This is acceptable UX behavior

---

## Test 9: Token Expiration ⏰

**Steps:**
1. Login with Google
2. Open browser console
3. Manually expire token:
```javascript
// Get current user
let user = JSON.parse(localStorage.getItem('dataxpert_user'));
console.log('Current user:', user);

// Set token to expired value (or clear it)
localStorage.setItem('dataxpert_token', 'expired_token_12345');

// Try to access dashboard
window.location.reload();
```

**Expected Results:**
- ✅ Verification fails (401 error)
- ✅ Redirected to login page automatically
- ✅ Must login again to access dashboard

---

## Test 10: Console Errors Check 🐛

**Steps:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Perform Tests 1-5 above
4. Watch for any errors

**Expected Results:**
- ✅ No console errors (except expected 401 on token expiration)
- ✅ No network errors in Network tab
- ✅ All API calls return 200 or appropriate status codes

---

## Common Issues & Fixes

### Issue: "Google token verification failed"
**Cause:** Google Client ID not configured or incorrect
**Fix:**
```bash
# Check .env file
GOOGLE_CLIENT_ID=your_actual_client_id_here

# Also check frontend/js/config.js
const GOOGLE_CLIENT_ID = 'same_client_id_here';
```

### Issue: "Column 'profile_image' does not exist"
**Cause:** Database not migrated
**Fix:** Run in Supabase SQL Editor:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image TEXT;
```

### Issue: "Banner not showing"
**Cause:** localStorage flag present or business_name exists
**Fix:**
```javascript
// Clear flags in console
localStorage.removeItem('dataxpert_needs_profile_completion');
localStorage.removeItem('dataxpert_profile_banner_dismissed');

// OR set business_name to NULL in database
UPDATE users SET business_name = NULL WHERE id = YOUR_USER_ID;
```

### Issue: "Modal not auto-switching"
**Cause:** JavaScript error in auth.js
**Fix:** Check console for errors, verify auth.js loaded properly

### Issue: "Profile picture not loading"
**Cause:** Google profile image URL blocked or invalid
**Fix:** Check Network tab for failed image requests, verify CORS settings

---

## Quick SQL Queries for Testing

### View all Google users:
```sql
SELECT id, name, email, google_id, business_name, profile_image IS NOT NULL as has_image
FROM users 
WHERE google_id IS NOT NULL
ORDER BY created_at DESC;
```

### Reset user for testing:
```sql
-- Remove Google linkage but keep account
UPDATE users 
SET google_id = NULL, profile_image = NULL, business_name = NULL
WHERE email = 'test@example.com';
```

### Delete test user completely:
```sql
-- ⚠️ WARNING: This deletes all user data!
DELETE FROM users WHERE email = 'test@example.com';
```

### Check password generation:
```sql
SELECT 
    id, 
    name, 
    email, 
    google_id IS NOT NULL as has_google,
    password IS NOT NULL as has_password,
    LENGTH(password) as pwd_length
FROM users
ORDER BY created_at DESC
LIMIT 10;
```

---

## Test Completion Checklist

- [ ] Test 1: New user signup ✅
- [ ] Test 2: Duplicate signup ❌
- [ ] Test 3: Existing user login ✅
- [ ] Test 4: Login without account ❌
- [ ] Test 5: Profile completion 📝
- [ ] Test 6: Manual + Google linking 🔗
- [ ] Test 7: Banner dismissal 🚫
- [ ] Test 8: Multi-tab consistency 🔄
- [ ] Test 9: Token expiration ⏰
- [ ] Test 10: No console errors 🐛

---

## Success Criteria

✅ All 10 tests pass without errors
✅ Database records are correct
✅ No console errors or warnings
✅ User experience is smooth and intuitive
✅ All error messages are clear and helpful
✅ Modal switching works automatically
✅ Banner shows and hides correctly
✅ Profile completion works end-to-end

---

**Happy Testing! 🎉**

If you encounter any issues not covered here, check:
1. Browser console for JavaScript errors
2. Network tab for API call failures
3. Backend terminal for Python errors
4. Supabase dashboard for database issues

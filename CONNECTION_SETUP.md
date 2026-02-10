# ✅ Complete Frontend-Backend Connection Guide

## 🎯 Final Setup Checklist

Follow these steps **IN ORDER** to connect your Render backend with Vercel frontend.

---

## Step 1: Configure CORS on Render ⚙️

### Go to Render Dashboard
1. Visit: https://dashboard.render.com/
2. Click on your **dataxpert-5twp** service
3. Click **Environment** tab (left sidebar)

### Add/Update CORS_ORIGINS Variable
Look for the `CORS_ORIGINS` variable:

**If it EXISTS:**
- Click **Edit** (pencil icon)
- Make sure the value is EXACTLY:
  ```
  https://dataxpert-orcin.vercel.app,https://dataxpert-5twp.onrender.com
  ```
- Click **Save Changes**

**If it DOESN'T EXIST:**
- Click **Add Environment Variable**
- **Key:** `CORS_ORIGINS`
- **Value:** `https://dataxpert-orcin.vercel.app,https://dataxpert-5twp.onrender.com`
- Click **Add**

### Wait for Render to Redeploy
- Render will automatically redeploy (2-3 minutes)
- Wait for status to show **"Live"** with green dot
- Check logs to confirm no errors

---

## Step 2: Verify Backend is Running ✅

### Test Backend Health Endpoint
Open this URL in your browser:
```
https://dataxpert-5twp.onrender.com/api/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "service": "DataXpert API",
  "timestamp": "2026-02-10T..."
}
```

If you see **"Welcome to DataXpert API"** at the root URL, that's normal!
The health endpoint is at `/api/health`.

---

## Step 3: Wait for Vercel Deployment 🚀

### Check Vercel Dashboard
1. Visit: https://vercel.com/dashboard
2. Find your **dataxpert** project
3. Check **Deployments** tab
4. Wait for latest deployment to show **"Ready"** status (~1-2 minutes)

### What You Should See:
- ✅ **Production** deployment is ready
- ✅ Green checkmark next to latest commit
- ✅ "Ready" status

---

## Step 4: Test Frontend Connection 🧪

### Open Your Live Site
Visit: **https://dataxpert-orcin.vercel.app/**

### Clear Browser Cache (IMPORTANT!)
Press: **`Ctrl + Shift + R`** (Windows) or **`Cmd + Shift + R`** (Mac)

### Open Developer Console
Press **F12** → Click **Console** tab

### Run This Test Command:
Paste this in the console and press Enter:
```javascript
fetch('https://dataxpert-5twp.onrender.com/api/health')
  .then(r => r.json())
  .then(d => console.log('✅ Backend Connected:', d))
  .catch(e => console.error('❌ Connection Failed:', e))
```

**Expected Result:**
```
✅ Backend Connected: {status: "healthy", service: "DataXpert API", ...}
```

---

## Step 5: Test User Signup 📝

### Try Creating an Account
1. Click **"Sign Up"** on the homepage
2. Fill in the form:
   - Username: `testuser`
   - Email: `test@example.com`
   - Password: `Test123!`
   - Confirm Password: `Test123!`
3. Click **"Sign Up"**

### Check Console for API Calls
You should see:
```
POST https://dataxpert-5twp.onrender.com/api/auth/signup 200
```

**If you see 201 or 200 status → ✅ SUCCESS!**

---

## ⚠️ Troubleshooting

### Problem: CORS Errors
```
Access to fetch blocked by CORS policy
```
**Solution:**
- Double-check `CORS_ORIGINS` on Render includes BOTH URLs
- Wait for Render to finish redeploying
- Clear browser cache with `Ctrl + Shift + R`

### Problem: 404 Not Found
```
GET https://dataxpert-orcin.vercel.app/api/health 404
```
**Solution:**
- Vercel hasn't deployed latest code yet
- Wait 2-3 more minutes
- Check Vercel dashboard for deployment status
- Force refresh with `Ctrl + Shift + R`

### Problem: 500 Internal Server Error
**Solution:**
- Check Render logs: Dashboard → Logs tab
- Verify all environment variables are set:
  - `CORS_ORIGINS`
  - `SUPABASE_URL`
  - `SUPABASE_KEY`
  - `SECRET_KEY`
  - `JWT_SECRET_KEY`

### Problem: "Token is missing" or Auth Errors
**Solution:**
- Make sure you're using the LIVE site (https://dataxpert-orcin.vercel.app)
- Not testing on localhost
- Clear browser cache and localStorage
- Try incognito/private browsing mode

---

## 🎉 Success Indicators

You'll know everything is working when:

✅ No CORS errors in browser console  
✅ API calls show: `https://dataxpert-5twp.onrender.com/api/...`  
✅ Health check returns status: "healthy"  
✅ Signup/Login works without errors  
✅ Can see data in Supabase after signup  

---

## 🔗 Quick Links

- **Frontend (Vercel):** https://dataxpert-orcin.vercel.app/
- **Backend (Render):** https://dataxpert-5twp.onrender.com/
- **Backend Health:** https://dataxpert-5twp.onrender.com/api/health
- **Render Dashboard:** https://dashboard.render.com/
- **Vercel Dashboard:** https://vercel.com/dashboard
- **GitHub Repo:** https://github.com/PRINCE-24CS072/DataXpert

---

## 📋 Current Configuration Summary

### Frontend (config.js)
```javascript
const API_BASE_URL = 'https://dataxpert-5twp.onrender.com/api';
```

### Backend (Render Environment)
```
CORS_ORIGINS=https://dataxpert-orcin.vercel.app,https://dataxpert-5twp.onrender.com
```

### Expected API Routes
- POST `/api/auth/signup` - User registration
- POST `/api/auth/login` - User login
- POST `/api/auth/google` - Google OAuth
- GET `/api/user/profile` - Get user profile
- GET `/api/dashboard/stats` - Dashboard statistics
- POST `/api/business/data` - Add business data
- POST `/api/ai/chat` - AI chat analysis

---

## ⏱️ Timeline

1. **Now:** Code is pushed to GitHub
2. **~2 min:** Vercel finishes deployment
3. **~2 min:** Render finishes redeployment (after CORS update)
4. **Total:** Wait ~3-5 minutes from now

After 5 minutes, everything should be fully connected and working! 🚀

---

**Need Help?** Check the console for specific errors and refer to the troubleshooting section above.

# 🔐 Google OAuth Setup Guide

## Current Status
The Google Sign-In button shows as **"Coming Soon"** because Google OAuth needs to be configured.

## Option 1: Use Email/Password Only (Recommended for Now)
Your app **fully works** with email/password signup! Google OAuth is optional.

**You can:**
- ✅ Sign up with email/password
- ✅ Add business name
- ✅ Login and use all features

**To use the app now:**
1. Visit https://dataxpert-orcin.vercel.app/
2. Click **"Sign Up"**
3. Fill in:
   - Username
   - Business Name
   - Email
   - Password
4. Start using the app!

---

## Option 2: Enable Google Sign-In (Optional)

If you want Google OAuth, follow these steps:

### Step 1: Go to Google Cloud Console
1. Visit: https://console.cloud.google.com/
2. Select your project or create new one
3. Go to **APIs & Services** → **Credentials**

### Step 2: Configure OAuth Consent Screen
1. Click **OAuth consent screen** (left sidebar)
2. Choose **External**
3. Fill in:
   - **App name:** DataXpert
   - **User support email:** Your email
   - **Developer contact:** Your email
4. Click **Save and Continue**
5. Skip **Scopes** → Click **Save and Continue**
6. Add **Test users:**
   - Add your email
   - Add any emails you want to test with
7. Click **Save and Continue**

### Step 3: Create OAuth Client ID
1. Go to **Credentials**
2. Click **+ CREATE CREDENTIALS**
3. Select **OAuth client ID**
4. Choose **Web application**
5. Fill in:
   - **Name:** DataXpert Web Client
   - **Authorized JavaScript origins:**
     ```
     https://dataxpert-orcin.vercel.app
     ```
   - **Authorized redirect URIs:**
     ```
     https://dataxpert-orcin.vercel.app
     https://dataxpert-orcin.vercel.app/
     ```
6. Click **Create**
7. **Copy the Client ID** (looks like: `xxxxx.apps.googleusercontent.com`)

### Step 4: Update Your Frontend
1. Open `frontend/js/config.js`
2. Replace the Client ID:
```javascript
const GOOGLE_CLIENT_ID = 'YOUR-NEW-CLIENT-ID-HERE.apps.googleusercontent.com';
```
3. Save the file
4. Commit and push:
```bash
git add frontend/js/config.js
git commit -m "Update Google OAuth client ID"
git push
```

### Step 5: Add Client Secret to Render
1. Go to https://dashboard.render.com/
2. Click your **dataxpert-5twp** service
3. Go to **Environment** tab
4. Update **GOOGLE_CLIENT_SECRET**:
   - Use the secret from Google Cloud Console
5. Click **Save**

### Step 6: Test
1. Wait for Vercel deployment (~2 min)
2. Visit https://dataxpert-orcin.vercel.app/
3. Hard refresh: `Ctrl + Shift + R`
4. Click **"Sign Up"**
5. ✅ You should see: **"Sign up with Google"** button (enabled)

---

## Troubleshooting

### Button still shows "Coming Soon"
**Solution:**
- Wait 2-3 minutes for Vercel deployment
- Hard refresh: `Ctrl + Shift + R`
- Check console for errors

### "Not authorized for this origin"
**Solution:**
- Add your domain to **Authorized JavaScript origins** in Google Cloud Console
- Make sure URL exactly matches: `https://dataxpert-orcin.vercel.app`

### "Access blocked: This app's request is invalid"
**Solution:**
- Complete **OAuth consent screen** configuration
- Add yourself as a **test user**
- App must be in **Testing** mode

---

## Current Features Working WITHOUT Google:
✅ Email/Password Signup  
✅ Email/Password Login  
✅ Business Name Collection  
✅ Profile Completion  
✅ All Dashboard Features  
✅ All AI Features  

**Google OAuth is completely optional!** Your app is fully functional with email/password authentication. 🚀

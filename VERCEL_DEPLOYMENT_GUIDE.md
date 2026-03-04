# DataXpert.dev Deployment Guide

## ✅ Deployment Checklist

### 1. Google OAuth Configuration (MUST DO FIRST)

**Go to**: [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)

1. Select your project
2. Click on OAuth 2.0 Client ID: `72842356502-l4np4rfm963i89r17f8dlk7v7bmtrg6a`
3. Under **Authorized JavaScript origins**, add:
   ```
   https://dataxpert.dev
   https://www.dataxpert.dev
   ```
4. Under **Authorized redirect URIs**, add:
   ```
   https://dataxpert.dev
   https://www.dataxpert.dev
   ```
5. Click **SAVE**
6. Wait 5-10 minutes for Google to propagate changes

---

### 2. Backend Deployment (Vercel)

**Option A: Deploy Backend Separately on Vercel**

1. Create a new Vercel project for backend:
   ```bash
   cd backend
   vercel
   ```

2. Set environment variables in Vercel Dashboard:
   ```
   SECRET_KEY=your-secret-key
   JWT_SECRET_KEY=your-jwt-secret
   SUPABASE_URL=your-supabase-url
   SUPABASE_KEY=your-supabase-key
   GOOGLE_CLIENT_ID=72842356502-l4np4rfm963i89r17f8dlk7v7bmtrg6a
   CORS_ORIGINS=https://dataxpert.dev,https://www.dataxpert.dev,http://localhost:5500
   ```

3. Note your backend URL (e.g., `https://dataxpert-backend.vercel.app`)

**Option B: Keep Backend on Render.com**

1. Go to Render.com dashboard
2. Add environment variable:
   ```
   CORS_ORIGINS=https://dataxpert.dev,https://www.dataxpert.dev,http://localhost:5500,http://127.0.0.1:5500
   ```
3. Save and redeploy

---

### 3. Frontend Configuration

Update `frontend/js/config.js` with your backend URL:

```javascript
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : 'https://YOUR-BACKEND-URL.vercel.app/api'; // or Render URL
```

---

### 4. Frontend Deployment (Vercel)

Your frontend is already connected to Vercel. Just push changes:

```bash
git add .
git commit -m "Update config for production domain"
git push origin main
```

Vercel will auto-deploy to **dataxpert.dev**

---

### 5. Verify Deployment

1. Visit `https://dataxpert.dev`
2. Clear browser cache (Ctrl + Shift + Delete)
3. Try Google Sign-In
4. Check browser console for errors (F12)

---

## 🔍 Troubleshooting

### Error: "Authentication error. Please try again"

**Cause**: Google OAuth origins not updated

**Fix**: 
- Verify authorized origins in Google Console include `https://dataxpert.dev`
- Wait 5-10 minutes after saving changes
- Clear browser cache

---

### Error: CORS blocked

**Cause**: Backend CORS_ORIGINS doesn't include new domain

**Fix**: Add domain to CORS_ORIGINS environment variable in backend

---

### Error: API calls fail

**Cause**: Frontend config points to wrong backend URL

**Fix**: Update `API_BASE_URL` in `frontend/js/config.js`

---

## 📋 Environment Variables Reference

### Backend (Vercel/Render)
```env
SECRET_KEY=<your-secret-key>
JWT_SECRET_KEY=<your-jwt-secret>
SUPABASE_URL=<your-supabase-url>
SUPABASE_KEY=<your-supabase-key>
GOOGLE_CLIENT_ID=72842356502-l4np4rfm963i89r17f8dlk7v7bmtrg6a
CORS_ORIGINS=https://dataxpert.dev,https://www.dataxpert.dev,http://localhost:5500
```

---

## 🚀 Quick Fix Checklist

- [ ] Added `https://dataxpert.dev` to Google OAuth authorized origins
- [ ] Added `https://dataxpert.dev` to Google OAuth redirect URIs
- [ ] Saved Google OAuth changes (wait 5-10 min)
- [ ] Updated backend `CORS_ORIGINS` environment variable
- [ ] Updated frontend `config.js` with correct backend URL
- [ ] Deployed frontend to Vercel
- [ ] Cleared browser cache
- [ ] Tested Google Sign-In on `https://dataxpert.dev`

---

## Contact Support

If issues persist, check:
- Browser console errors (F12 → Console)
- Network tab for failed requests (F12 → Network)
- Backend logs in Vercel/Render dashboard

# 🔧 Render Environment Setup

## Add CORS Environment Variable

1. Go to **Render Dashboard**: https://dashboard.render.com/
2. Click on your **dataxpert-5twp** service
3. Click **Environment** tab (left sidebar)
4. Click **Add Environment Variable**
5. Add:
   ```
   Key: CORS_ORIGINS
   Value: https://dataxpert-orcin.vercel.app,https://dataxpert-5twp.onrender.com
   ```
6. Click **Save Changes**
7. Wait for automatic redeploy (~2-3 minutes)

## Why This Is Needed

Without CORS configured, your Vercel frontend cannot make API calls to your Render backend due to browser security (CORS policy).

## Verify It's Working

After the redeploy completes, visit:
- Backend: https://dataxpert-5twp.onrender.com/ (should show the JSON you see)
- Frontend: https://dataxpert-orcin.vercel.app/ (should load properly)

Try signing up/logging in from the frontend.

# DataXpert - Render Deployment Guide

## 🚀 Quick Deploy to Render

### Prerequisites
- Render account ([render.com](https://render.com))
- Supabase project with configured database
- Google OAuth credentials (optional)

---

## 📋 Deployment Steps

### Option 1: Using render.yaml (Recommended)

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Optimize for Render deployment"
   git push origin main
   ```

2. **Connect to Render**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click **New +** → **Blueprint**
   - Connect your GitHub repository
   - Select the repository with `render.yaml`
   - Render will automatically detect the configuration

3. **Set Environment Variables**
   
   In Render dashboard, add these environment variables:
   
   | Variable | Value | Required |
   |----------|-------|----------|
   | `SECRET_KEY` | Your Flask secret key | ✅ |
   | `JWT_SECRET_KEY` | Your JWT secret key | ✅ |
   | `SUPABASE_URL` | `https://xxx.supabase.co` | ✅ |
   | `SUPABASE_KEY` | Your Supabase anon key | ✅ |
   | `GOOGLE_CLIENT_ID` | Google OAuth Client ID | ⚠️ Optional |
   | `GOOGLE_CLIENT_SECRET` | Google OAuth Secret | ⚠️ Optional |
   | `CORS_ORIGINS` | `https://your-frontend.vercel.app` | ✅ |

4. **Deploy**
   - Click **Create Blueprint Instance**
   - Wait for build to complete (~3-5 minutes)
   - Your backend will be live at: `https://your-app.onrender.com`

---

### Option 2: Manual Web Service Creation

1. **Create New Web Service**
   - Go to Render Dashboard
   - Click **New +** → **Web Service**
   - Connect your GitHub repository

2. **Configure Build Settings**
   
   | Setting | Value |
   |---------|-------|
   | **Name** | `dataxpert-backend` |
   | **Region** | Oregon (US West) |
   | **Branch** | `main` |
   | **Root Directory** | `backend` |
   | **Runtime** | Python 3 |
   | **Build Command** | `pip install --upgrade pip setuptools wheel && pip install -r requirements.txt` |
   | **Start Command** | `gunicorn app:app --config gunicorn_config.py` |

3. **Advanced Settings**
   - **Instance Type**: Free (or Starter for production)
   - **Health Check Path**: `/`
   - **Auto-Deploy**: Yes

4. **Add Environment Variables** (same as Option 1)

5. **Deploy**
   - Click **Create Web Service**
   - Monitor build logs for any errors

---

## 🔧 Configuration Files Explained

### `runtime.txt`
```
python-3.11.9
```
Specifies Python 3.11.9 for stability and compatibility.

### `requirements.txt`
- Uses **version ranges** (`>=x.x.x,<y.0.0`) instead of exact pins
- Avoids build issues from overly strict versioning
- Includes `psycopg2-binary` (no compilation needed)
- Optimized for Python 3.11 compatibility

### `gunicorn_config.py`
- Production-ready WSGI server configuration
- Auto-scales workers based on CPU cores
- Proper logging and timeout settings
- Health check support

### `Procfile`
```
web: gunicorn app:app --config gunicorn_config.py
```
Backup start command (used if Blueprint not detected).

### `render.yaml`
Infrastructure-as-Code for Render deployment.

---

## 🐛 Troubleshooting

### Build Fails
**Issue**: Dependency compilation errors (pandas, numpy, etc.)

**Solution**:
- Ensure `runtime.txt` has `python-3.11.9`
- Check Render build logs
- Verify all environment variables are set

### App Crashes on Start
**Issue**: Missing environment variables

**Solution**:
```bash
# Check Render logs for:
ValueError: SUPABASE_URL and SUPABASE_KEY must be set
```
Add missing variables in Render dashboard.

### CORS Errors
**Issue**: Frontend can't connect to backend

**Solution**:
Update `CORS_ORIGINS` environment variable:
```
CORS_ORIGINS=https://your-frontend.vercel.app,https://your-custom-domain.com
```

### Slow Response Times
**Issue**: Free tier limitations

**Solution**:
- Upgrade to Starter plan ($7/month)
- Increase `WEB_CONCURRENCY` env var
- Enable preload in gunicorn config (already enabled)

---

## 📊 Performance Optimization

### For Production Use:

1. **Upgrade Instance Type**
   - Free: 512MB RAM, spins down after 15min inactivity
   - Starter: 512MB RAM, always on ($7/month)
   - Standard: 2GB RAM, better performance ($25/month)

2. **Environment Variables for Performance**
   ```
   WEB_CONCURRENCY=4          # Increase workers
   LOG_LEVEL=warning          # Reduce log verbosity
   FLASK_ENV=production       # Ensure production mode
   ```

3. **Database Connection Pooling**
   - Supabase handles this automatically
   - No additional configuration needed

---

## 🔐 Security Checklist

- ✅ All secrets stored as environment variables
- ✅ `.env` file not committed to Git
- ✅ CORS properly configured
- ✅ JWT tokens with secure keys
- ✅ HTTPS enabled by default on Render
- ✅ Python-dotenv loads environment variables

---

## 📱 Connecting Frontend

Update your frontend `config.js`:

```javascript
const API_BASE_URL = 'https://your-app.onrender.com/api';
```

Or use environment detection:
```javascript
const API_BASE_URL = process.env.NODE_ENV === 'production'
    ? 'https://your-app.onrender.com/api'
    : 'http://localhost:5000/api';
```

---

## 🔄 Continuous Deployment

Render auto-deploys when you push to GitHub:

```bash
git add .
git commit -m "Update feature"
git push origin main
```

Monitor deployment in Render dashboard.

---

## 📈 Monitoring

### View Logs
- Go to your service in Render dashboard
- Click **Logs** tab
- Real-time streaming logs available

### Metrics (Paid Plans)
- CPU usage
- Memory usage
- Request latency
- Error rates

---

## 🆘 Support

- **Render Docs**: https://render.com/docs
- **Render Discord**: https://discord.gg/render
- **GitHub Issues**: Create issue in your repository

---

## ✅ Deployment Checklist

Before deploying:

- [ ] `runtime.txt` exists with Python 3.11.9
- [ ] `requirements.txt` optimized
- [ ] `gunicorn_config.py` present
- [ ] `Procfile` created
- [ ] All environment variables documented
- [ ] `.env` in `.gitignore`
- [ ] CORS origins configured
- [ ] Supabase database schema created
- [ ] Google OAuth configured (if using)
- [ ] Frontend API endpoint updated

After deploying:

- [ ] Build completed successfully
- [ ] Health check passing
- [ ] Test API endpoints
- [ ] Verify database connection
- [ ] Test authentication flow
- [ ] Check CORS from frontend

---

**🎉 Your DataXpert backend is now production-ready on Render!**
